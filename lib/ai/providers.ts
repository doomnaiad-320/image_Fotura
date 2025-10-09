import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const headersSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .transform((value) => {
    const entries = Object.entries(value).reduce<Record<string, string>>(
      (accumulator, [key, raw]) => {
        if (raw === undefined || raw === null) {
          return accumulator;
        }
        accumulator[key] = String(raw);
        return accumulator;
      },
      {}
    );
    return entries;
  });

export const providerInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  baseURL: z.string().url(),
  apiKey: z.string().optional().nullable(),
  extraHeaders: headersSchema.optional(),
  enabled: z.boolean().default(true)
});

export type ProviderInput = z.infer<typeof providerSchema>;
const providerSchema = providerInputSchema;

const EMPTY_HEADERS = "{}";

export function serializeProviderHeaders(headers?: Record<string, string> | null) {
  if (!headers || Object.keys(headers).length === 0) {
    return EMPTY_HEADERS;
  }
  return JSON.stringify(headers);
}

export function parseProviderHeaders(value: unknown): Record<string, string> {
  if (!value) {
    return {};
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed).reduce<Record<string, string>>((accumulator, [key, raw]) => {
          if (raw === undefined || raw === null) {
            return accumulator;
          }
          accumulator[key] = String(raw);
          return accumulator;
        }, {});
      }
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).reduce<Record<string, string>>((accumulator, [key, raw]) => {
      if (raw === undefined || raw === null) {
        return accumulator;
      }
      accumulator[key] = String(raw);
      return accumulator;
    }, {});
  }
  return {};
}

export async function listProviders() {
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "desc" }
  });

  return providers.map((provider) => ({
    ...provider,
    apiKeyEncrypted: undefined,
    hasApiKey: Boolean(provider.apiKeyEncrypted),
    extraHeaders: parseProviderHeaders(provider.extraHeaders)
  }));
}

export async function getProviderBySlug(slug: string) {
  const provider = await prisma.provider.findUnique({ where: { slug } });
  if (!provider) {
    return null;
  }
  return {
    ...provider,
    apiKeyEncrypted: undefined,
    hasApiKey: Boolean(provider.apiKeyEncrypted),
    extraHeaders: parseProviderHeaders(provider.extraHeaders)
  };
}

export async function upsertProvider(input: ProviderInput) {
  const payload = providerSchema.parse(input);
  const existing = await prisma.provider.findUnique({ where: { slug: payload.slug } });
  const encrypted = payload.apiKey
    ? encryptSecret(payload.apiKey)
    : existing?.apiKeyEncrypted ?? "";
  const serializedHeaders =
    payload.extraHeaders !== undefined
      ? serializeProviderHeaders(payload.extraHeaders)
      : existing?.extraHeaders ?? EMPTY_HEADERS;

  return prisma.provider.upsert({
    where: { slug: payload.slug },
    update: {
      name: payload.name,
      baseURL: payload.baseURL,
      apiKeyEncrypted: encrypted,
      extraHeaders: serializedHeaders,
      enabled: payload.enabled
    },
    create: {
      slug: payload.slug,
      name: payload.name,
      baseURL: payload.baseURL,
      apiKeyEncrypted: encrypted,
      extraHeaders: serializeProviderHeaders(payload.extraHeaders ?? {}),
      enabled: payload.enabled
    }
  });
}

export async function deleteProvider(slug: string) {
  await prisma.provider.delete({ where: { slug } });
}

export async function toggleProvider(slug: string, enabled: boolean) {
  await prisma.provider.update({
    where: { slug },
    data: { enabled }
  });
}

export type RemoteModel = {
  id: string;
  name?: string;
  description?: string;
  capabilities?: string[];
};

async function fetchModelList(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...headers
    }
  });

  if (!response.ok) {
    throw new Error(`模型列表拉取失败: ${response.status}`);
  }

  const json = await response.json();
  return json;
}

export async function pullModelsFromProvider(providerSlug: string) {
  const provider = await prisma.provider.findUnique({ where: { slug: providerSlug } });
  if (!provider) {
    throw new Error("Provider 不存在");
  }

  const headers: Record<string, string> = {};
  const apiKey = provider.apiKeyEncrypted ? decryptSecret(provider.apiKeyEncrypted) : "";
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const extraHeaders = parseProviderHeaders(provider.extraHeaders);
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }

  const base = provider.baseURL.replace(/\/$/, "");
  const targetEndpoints = [
    `${base}/v1/models`,
    base.includes("openrouter") ? "https://openrouter.ai/api/v1/models" : undefined,
    base.includes("together") ? "https://api.together.xyz/v1/models" : undefined,
    base.includes("ollama") ? `${base}/api/tags` : undefined
  ].filter(Boolean) as string[];

  const errors: string[] = [];
  for (const endpoint of targetEndpoints) {
    try {
      const raw = await fetchModelList(endpoint, headers);
      return normalizeRemoteModels(raw);
    } catch (error) {
      errors.push(`${endpoint}: ${(error as Error).message}`);
    }
  }

  throw new Error(`拉取失败：${errors.join(" | ")}`);
}

function normalizeRemoteModels(payload: any): RemoteModel[] {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload.data)) {
    return payload.data.map((item: any) => ({
      id: item.id ?? item.name,
      name: item.name ?? item.id,
      description: item.description,
      capabilities: item.capabilities ?? item.modalities ?? []
    }));
  }
  if (Array.isArray(payload.models)) {
    return payload.models.map((item: any) => ({
      id: item.id ?? item.name,
      name: item.name ?? item.id,
      description: item.description,
      capabilities: item.capabilities ?? []
    }));
  }
  return [];
}
