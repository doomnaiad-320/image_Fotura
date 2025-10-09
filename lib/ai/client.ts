import OpenAI from "openai";

import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { parseProviderHeaders } from "@/lib/ai/providers";

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

  const provider = {
    ...model.provider,
    extraHeaders: parseProviderHeaders(model.provider.extraHeaders)
  };

  const normalizedModel = {
    ...model,
    provider
  };

  return { model: normalizedModel, provider, apiKey };
}

export function createOpenAIClient(context: ResolvedModel) {
  if (MOCK_AI) {
    return null;
  }

  const headers = parseProviderHeaders(context.provider.extraHeaders);

  return new OpenAI({
    apiKey: context.apiKey,
    baseURL: context.provider.baseURL.replace(/\/$/, ""),
    defaultHeaders: headers ?? undefined,
    timeout: AI_TIMEOUT_MS
  });
}

export function getProviderHeaders(context: ResolvedModel) {
  const headers = parseProviderHeaders(context.provider.extraHeaders);
  return headers ?? {};
}

export function isMockMode() {
  return MOCK_AI;
}
