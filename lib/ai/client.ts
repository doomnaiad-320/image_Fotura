import OpenAI from "openai";

import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 60_000);
const MOCK_AI = process.env.MOCK_AI === "1";

type ResolvedModel = Awaited<ReturnType<typeof resolveModel>>;

export async function resolveModel(modelSlug: string) {
  const model = await prisma.aiModel.findUnique({
    where: { slug: modelSlug },
    include: {
      provider: true
    }
  });

  if (!model || !model.enabled) {
    throw new Error("模型不可用或不存在");
  }

  if (!model.provider || !model.provider.enabled) {
    throw new Error("模型所属 Provider 未启用");
  }

  const apiKey = model.provider.apiKeyEncrypted
    ? decryptSecret(model.provider.apiKeyEncrypted)
    : "";

  if (!apiKey && !MOCK_AI) {
    throw new Error("Provider 未配置 API Key");
  }

  return { model, provider: model.provider, apiKey };
}

export function createOpenAIClient(context: ResolvedModel) {
  if (MOCK_AI) {
    return null;
  }

  const headers = context.provider.extraHeaders as Record<string, string> | null;

  return new OpenAI({
    apiKey: context.apiKey,
    baseURL: context.provider.baseURL.replace(/\/$/, ""),
    defaultHeaders: headers ?? undefined,
    timeout: AI_TIMEOUT_MS
  });
}

export function getProviderHeaders(context: ResolvedModel) {
  const headers = context.provider.extraHeaders as Record<string, string> | null;
  return headers ?? {};
}

export function isMockMode() {
  return MOCK_AI;
}
