import { TransactionStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createRateLimiter } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { resolveModel, createOpenAIClient, isMockMode } from "@/lib/ai/client";
import { calculateChatCost } from "@/lib/ai/pricing";
import { createUsageRecord, updateUsageRecord } from "@/lib/ai/usage";
import { ensureUserHasCredits } from "@/lib/ai/guards";
import { finalizeCredits, prechargeCredits, refundCredits } from "@/lib/credits";

export const runtime = "nodejs";

const rateLimiter = createRateLimiter({ windowMs: 60_000, max: 30, prefix: "chat" });

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"], {
    invalid_type_error: "消息角色不合法"
  }),
  content: z.string().min(1)
});

const bodySchema = z.object({
  model: z.string().min(1),
  messages: z.array(messageSchema).min(1),
  stream: z.boolean().optional().default(false),
  max_tokens: z.number().optional(),
  temperature: z.number().optional()
});

function estimateTokens(messages: { content: string }[]) {
  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
  return Math.max(8, Math.ceil(totalChars / 4));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const limiter = rateLimiter.check(user.id);
  if (!limiter.success) {
    return NextResponse.json(
      { message: "请求过于频繁，请稍后重试" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limiter.reset - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const payload = bodySchema.parse(body);

    const context = await resolveModel(payload.model);
    await ensureUserHasCredits(user.id, 1);

    const estimatedTokens = estimateTokens(payload.messages);
    const estimatedCost = calculateChatCost({
      pricing: context.model.pricing,
      promptTokens: estimatedTokens,
      completionTokens: estimatedTokens / 2
    });

    const requestId = randomUUID();

    const transaction = await prechargeCredits({
      userId: user.id,
      amount: estimatedCost,
      reason: "chat.precharge",
      providerId: context.provider.id,
      providerSlug: context.provider.slug,
      modelId: context.model.id,
      modelSlug: context.model.slug
    });

    await createUsageRecord({
      requestId,
      userId: user.id,
      modelId: context.model.id,
      modelSlug: context.model.slug,
      providerSlug: context.provider.slug,
      kind: "chat"
    });

    if (isMockMode()) {
      const mockContent = `【MOCK】基于模型 ${context.model.displayName} 的回答：${payload.messages
        .map((m) => m.content)
        .join(" / ")}`;

      await finalizeCredits(transaction.id, {
        status: TransactionStatus.success,
        actualCost: Math.min(estimatedCost, 5),
        metadata: { mock: true }
      });

      await updateUsageRecord(requestId, {
        status: TransactionStatus.success,
        inputTokens: estimatedTokens,
        outputTokens: estimatedTokens,
        cost: Math.min(estimatedCost, 5)
      });

      return NextResponse.json({
        id: requestId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: context.model.slug,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: mockContent
            },
            finish_reason: "stop"
          }
        ],
        usage: {
          prompt_tokens: estimatedTokens,
          completion_tokens: estimatedTokens,
          total_tokens: estimatedTokens * 2
        }
      });
    }

    const client = createOpenAIClient(context);
    if (!client) {
      throw new Error("OpenAI 客户端初始化失败");
    }

    if (payload.stream) {
      try {
        const openAIResponse = await client.chat.completions.create({
          model: context.model.slug,
          messages: payload.messages,
          stream: true,
          max_tokens: payload.max_tokens,
          temperature: payload.temperature
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              for await (const part of openAIResponse) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(part)}\n\n`)
                );
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              await finalizeCredits(transaction.id, {
                status: TransactionStatus.success,
                actualCost: estimatedCost
              });
              await updateUsageRecord(requestId, {
                status: TransactionStatus.success,
                cost: estimatedCost
              });
            } catch (error) {
              controller.error(error);
              await refundCredits(transaction.id, (error as Error).message);
              await updateUsageRecord(requestId, {
                status: TransactionStatus.failed
              });
            }
          }
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream"
          }
        });
      } catch (error) {
        await refundCredits(transaction.id, (error as Error).message);
        await updateUsageRecord(requestId, {
          status: TransactionStatus.failed
        });
        throw error;
      }
    }

    try {
      const completion = await client.chat.completions.create({
        model: context.model.slug,
        messages: payload.messages,
        max_tokens: payload.max_tokens,
        temperature: payload.temperature
      });

      const promptTokens = completion.usage?.prompt_tokens ?? estimatedTokens;
      const completionTokens = completion.usage?.completion_tokens ?? estimatedTokens;
      const totalCost = calculateChatCost({
        pricing: context.model.pricing,
        promptTokens,
        completionTokens
      });

      await finalizeCredits(transaction.id, {
        status: TransactionStatus.success,
        actualCost: totalCost,
        metadata: completion.usage ? completion.usage : undefined
      });

      await updateUsageRecord(requestId, {
        status: TransactionStatus.success,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        cost: totalCost
      });

      return NextResponse.json({ ...completion, id: requestId });
    } catch (error) {
      await refundCredits(transaction.id, (error as Error).message);
      await updateUsageRecord(requestId, {
        status: TransactionStatus.failed
      });
      throw error;
    }
  } catch (error) {
    console.error("[chat.completions]", error);
    const message = error instanceof Error ? error.message : "调用失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
