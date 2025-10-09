import { TransactionStatus } from "@prisma/client";
import { randomUUID } from "crypto";

import { ensureUserHasCredits } from "@/lib/ai/guards";
import { createOpenAIClient, isMockMode, resolveModel } from "@/lib/ai/client";
import { calculateImageCost } from "@/lib/ai/pricing";
import { createUsageRecord, updateUsageRecord } from "@/lib/ai/usage";
import { finalizeCredits, prechargeCredits, refundCredits } from "@/lib/credits";

const MOCK_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAALElEQVR42mNgoBvw4T8DwwMDAwNDw78xwgiGGCEpBiBKU5jWiCWI5AAAb0MC3jWEW/MAAAAAElFTkSuQmCC";

export type ImageGenerateParams = {
  userId: string;
  modelSlug: string;
  prompt: string;
  size?: string;
  quantity?: number;
  responseFormat?: "url" | "b64_json";
};

export type ImageEditParams = {
  userId: string;
  modelSlug: string;
  prompt: string;
  size?: string;
  quantity?: number;
  image: File;
  mask?: File;
};

export async function generateImages(params: ImageGenerateParams) {
  const context = await resolveModel(params.modelSlug);
  await ensureUserHasCredits(params.userId, 1);

  const n = params.quantity ?? 1;
  const responseFormat = params.responseFormat ?? "url";

  const estimatedCost = calculateImageCost({
    pricing: context.model.pricing,
    size: params.size,
    quantity: n,
    mode: "generate"
  });

  const requestId = randomUUID();
  const transaction = await prechargeCredits({
    userId: params.userId,
    amount: estimatedCost,
    reason: "image.generate.precharge",
    providerId: context.provider.id,
    providerSlug: context.provider.slug,
    modelId: context.model.id,
    modelSlug: context.model.slug
  });

  await createUsageRecord({
    requestId,
    userId: params.userId,
    modelId: context.model.id,
    modelSlug: context.model.slug,
    providerSlug: context.provider.slug,
    kind: "image.generate"
  });

  if (isMockMode()) {
    const data = Array.from({ length: n }).map((_, index) =>
      responseFormat === "b64_json"
        ? { b64_json: MOCK_IMAGE, index }
        : {
            url: `https://picsum.photos/seed/mock-${index}/1024/1024`,
            index
          }
    );

    await finalizeCredits(transaction.id, {
      status: TransactionStatus.success,
      actualCost: Math.min(estimatedCost, 10),
      metadata: { mock: true }
    });

    await updateUsageRecord(requestId, {
      status: TransactionStatus.success,
      cost: Math.min(estimatedCost, 10)
    });

    return {
      id: requestId,
      created: Math.floor(Date.now() / 1000),
      object: "image.generation",
      data
    };
  }

  const client = createOpenAIClient(context);
  if (!client) {
    throw new Error("OpenAI 客户端初始化失败");
  }

  try {
    const result = await client.images.generate({
      model: context.model.slug,
      prompt: params.prompt,
      size: params.size,
      n,
      response_format: responseFormat
    });

    await finalizeCredits(transaction.id, {
      status: TransactionStatus.success,
      actualCost: estimatedCost,
      metadata: { size: params.size, count: n }
    });

    await updateUsageRecord(requestId, {
      status: TransactionStatus.success,
      cost: estimatedCost
    });

    return { ...result, id: requestId };
  } catch (error) {
    await refundCredits(transaction.id, (error as Error).message);
    await updateUsageRecord(requestId, {
      status: TransactionStatus.failed
    });
    throw error;
  }
}

export async function editImage(params: ImageEditParams) {
  const context = await resolveModel(params.modelSlug);
  await ensureUserHasCredits(params.userId, 1);

  const n = params.quantity ?? 1;
  const estimatedCost = calculateImageCost({
    pricing: context.model.pricing,
    size: params.size,
    quantity: n,
    mode: "edit"
  });

  const requestId = randomUUID();
  const transaction = await prechargeCredits({
    userId: params.userId,
    amount: estimatedCost,
    reason: "image.edit.precharge",
    providerId: context.provider.id,
    providerSlug: context.provider.slug,
    modelId: context.model.id,
    modelSlug: context.model.slug
  });

  await createUsageRecord({
    requestId,
    userId: params.userId,
    modelId: context.model.id,
    modelSlug: context.model.slug,
    providerSlug: context.provider.slug,
    kind: "image.edit"
  });

  if (isMockMode()) {
    const data = Array.from({ length: n }).map((_, index) => ({
      b64_json: MOCK_IMAGE,
      index
    }));

    await finalizeCredits(transaction.id, {
      status: TransactionStatus.success,
      actualCost: Math.min(estimatedCost, 12),
      metadata: { mock: true }
    });

    await updateUsageRecord(requestId, {
      status: TransactionStatus.success,
      cost: Math.min(estimatedCost, 12)
    });

    return {
      id: requestId,
      created: Math.floor(Date.now() / 1000),
      object: "image.edit",
      data
    };
  }

  const client = createOpenAIClient(context);
  if (!client) {
    throw new Error("OpenAI 客户端初始化失败");
  }

  const imageFile = params.image;
  const maskFile = params.mask;

  try {
    const result = await client.images.edit({
      model: context.model.slug,
      prompt: params.prompt,
      image: imageFile,
      mask: maskFile,
      size: params.size,
      n,
      response_format: "b64_json"
    });

    await finalizeCredits(transaction.id, {
      status: TransactionStatus.success,
      actualCost: estimatedCost,
      metadata: { size: params.size, count: n }
    });

    await updateUsageRecord(requestId, {
      status: TransactionStatus.success,
      cost: estimatedCost
    });

    return { ...result, id: requestId };
  } catch (error) {
    await refundCredits(transaction.id, (error as Error).message);
    await updateUsageRecord(requestId, {
      status: TransactionStatus.failed
    });
    throw error;
  }
}
