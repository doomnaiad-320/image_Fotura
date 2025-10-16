import { prisma } from "@/lib/prisma";
import { serializeProviderHeaders } from "@/lib/ai/providers";
import type { SeedProvider } from "@/seeds/providers";
import { z } from "zod";

import type { RemoteModel } from "./providers";

function serializeStringArray(value?: string[] | null) {
  return JSON.stringify(value ?? []);
}

function serializeRecord(value?: Record<string, unknown> | null) {
  return JSON.stringify(value ?? {});
}

function parseStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const modelSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-.:]+$/),
  displayName: z.string().min(2).max(120),
  providerSlug: z.string(),
  family: z.string().default("custom"),
  modalities: z.array(z.string()).default([]),
  supportsStream: z.boolean().default(false),
  pricing: z.record(z.any()).default({}),
  rateLimit: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([]),
  sort: z.number().default(100),
  enabled: z.boolean().default(true)
});

export type ModelInput = z.infer<typeof modelSchema>;

export async function listModels(providerSlug?: string) {
  return prisma.aiModel.findMany({
    where: providerSlug ? { provider: { slug: providerSlug } } : undefined,
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
    include: {
      provider: true
    }
  });
}

export async function getModelBySlug(slug: string) {
  return prisma.aiModel.findUnique({ where: { slug } });
}

export async function upsertModel(input: ModelInput) {
  const payload = modelSchema.parse(input);

  const provider = await prisma.provider.findUnique({ where: { slug: payload.providerSlug } });
  if (!provider) {
    throw new Error("Provider 不存在");
  }

  return prisma.aiModel.upsert({
    where: { slug: payload.slug },
    update: {
      displayName: payload.displayName,
      family: payload.family,
      modalities: serializeStringArray(payload.modalities),
      supportsStream: payload.supportsStream,
      pricing: serializeRecord(payload.pricing as Record<string, unknown>),
      rateLimit: serializeRecord(payload.rateLimit as Record<string, unknown>),
      tags: serializeStringArray(payload.tags),
      sort: payload.sort,
      enabled: payload.enabled
    },
    create: {
      slug: payload.slug,
      displayName: payload.displayName,
      providerId: provider.id,
      family: payload.family,
      modalities: serializeStringArray(payload.modalities),
      supportsStream: payload.supportsStream,
      pricing: serializeRecord(payload.pricing as Record<string, unknown>),
      rateLimit: serializeRecord(payload.rateLimit as Record<string, unknown>),
      tags: serializeStringArray(payload.tags),
      sort: payload.sort,
      enabled: payload.enabled
    }
  });
}

export async function toggleModel(slug: string, enabled: boolean) {
  await prisma.aiModel.update({ where: { slug }, data: { enabled } });
}

export async function deleteModel(slug: string) {
  await prisma.aiModel.delete({ where: { slug } });
}

/**
 * 获取系统配置的 Prompt 优化器模型
 * @returns Prompt 优化器模型，如果未配置则返回 null
 */
export async function getPromptOptimizerModel() {
  return prisma.aiModel.findFirst({
    where: {
      isPromptOptimizer: true,
      enabled: true,
      provider: { enabled: true }
    },
    include: {
      provider: true
    }
  });
}

/**
 * 设置某个模型为 Prompt 优化器
 * 注意：同一时间只能有一个模型被标记为优化器
 * @param slug 模型 slug
 */
export async function setPromptOptimizerModel(slug: string) {
  // 先取消所有模型的优化器标记
  await prisma.aiModel.updateMany({
    where: { isPromptOptimizer: true },
    data: { isPromptOptimizer: false }
  });

  // 设置新的优化器
  await prisma.aiModel.update({
    where: { slug },
    data: { isPromptOptimizer: true }
  });
}

export async function listEnabledModelsForPlayground() {
  const models = await prisma.aiModel.findMany({
    where: {
      enabled: true,
      provider: { enabled: true }
    },
    orderBy: [{ sort: "asc" }, { displayName: "asc" }],
    select: {
      slug: true,
      displayName: true,
      modalities: true,
      tags: true,
      supportsStream: true,
      provider: {
        select: {
          slug: true,
          name: true
        }
      }
    }
  });

  return models.map((model) => ({
    slug: model.slug,
    displayName: model.displayName,
    provider: model.provider,
    modalities: parseStringArrayValue(model.modalities),
    tags: parseStringArrayValue(model.tags),
    supportsStream: model.supportsStream
  }));
}

export async function importRemoteModels(providerSlug: string, remotes: RemoteModel[]) {
  const provider = await prisma.provider.findUnique({ where: { slug: providerSlug } });
  if (!provider) {
    throw new Error("Provider 不存在");
  }

  // 获取现有模型的最大 sort 值，用于为新模型分配递增的 sort
  const existingModels = await prisma.aiModel.findMany({
    where: { providerId: provider.id },
    orderBy: { sort: "desc" },
    take: 1
  });
  const maxSort = existingModels[0]?.sort ?? 0;

  // 只 upsert 选中的模型，不影响其他已有模型
  const upserts = remotes.map((remote, index) =>
    prisma.aiModel.upsert({
      where: { slug: remote.id },
      update: {
        displayName: remote.name ?? remote.id,
        tags: serializeStringArray(remote.capabilities ?? []),
        modalities: serializeStringArray(remote.capabilities ?? []),
        enabled: true
        // 保留原有 sort，不修改排序
      },
      create: {
        slug: remote.id,
        displayName: remote.name ?? remote.id,
        providerId: provider.id,
        family: remote.id.split(":")[0] ?? "custom",
        modalities: serializeStringArray(remote.capabilities ?? []),
        supportsStream: false,
        pricing: serializeRecord({
          unit: "token",
          currency: "credit",
          inputPerK: 10,
          outputPerK: 30,
          minimum: 15
        }),
        rateLimit: serializeRecord({ rpm: 60 }),
        tags: serializeStringArray(remote.capabilities ?? []),
        sort: maxSort + (index + 1) * 10, // 新模型排在最后
        enabled: true
      }
    })
  );

  await prisma.$transaction(upserts);

  // 移除了自动禁用未选中模型的逻辑
  // 用户的已有模型保持原样，不会被影响
}

export async function loadSeedsFromConfig(seeds: SeedProvider[]) {
  for (const provider of seeds) {
    const createdProvider = await prisma.provider.upsert({
      where: { slug: provider.slug },
      update: {
        name: provider.name,
        baseURL: provider.baseURL,
        enabled: true
      },
      create: {
        slug: provider.slug,
        name: provider.name,
        baseURL: provider.baseURL,
        apiKeyEncrypted: "",
        extraHeaders: serializeProviderHeaders(provider.extraHeaders ?? {}),
        enabled: true
      }
    });

    for (const model of provider.models) {
      await prisma.aiModel.upsert({
        where: { slug: model.slug },
        update: {
          displayName: model.displayName,
          family: model.family,
          modalities: serializeStringArray(model.modalities),
          supportsStream: model.supportsStream,
          pricing: serializeRecord(model.pricing),
          rateLimit: serializeRecord(model.rateLimit),
          tags: serializeStringArray(model.tags),
          enabled: true,
          sort: model.sort
        },
        create: {
          slug: model.slug,
          displayName: model.displayName,
          providerId: createdProvider.id,
          family: model.family,
          modalities: serializeStringArray(model.modalities),
          supportsStream: model.supportsStream,
          pricing: serializeRecord(model.pricing),
          rateLimit: serializeRecord(model.rateLimit),
          tags: serializeStringArray(model.tags),
          enabled: true,
          sort: model.sort
        }
      });
    }
  }
}
