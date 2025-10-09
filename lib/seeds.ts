import type {
  AiModel,
  PrismaClient,
  User
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { encryptSecret } from "./crypto.js";
import { serializeProviderHeaders } from "./ai/providers.js";
import { calculateHotScore } from "./ranking.js";
import { seedAssets } from "../seeds/assets.js";
import { seedProviders } from "../seeds/providers.js";

export type SeedOptions = {
  adminPassword?: string;
  userPassword?: string;
  enforceEncryptionKey?: string;
};

export type SeedResult = {
  admin: User;
  user: User;
  models: AiModel[];
};

export const FALLBACK_ENCRYPTION_KEY = "aigc-studio-dev-key-32bytes!!!@@";

export async function runSeed(
  prisma: PrismaClient,
  options: SeedOptions = {}
): Promise<SeedResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL 配置");
  }

  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY =
      options.enforceEncryptionKey ?? FALLBACK_ENCRYPTION_KEY;
  }

  await prisma.$transaction([
    prisma.aiUsage.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.creditTransaction.deleteMany(),
    prisma.aiModel.deleteMany(),
    prisma.provider.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany()
  ]);

  const adminPassword = options.adminPassword ?? "Admin123!@#";
  const userPassword = options.userPassword ?? "User123!@#";

  const [admin, regularUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@aigc.studio",
        name: "超级管理员",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "admin",
        credits: 100_000
      }
    }),
    prisma.user.create({
      data: {
        email: "user@aigc.studio",
        name: "创作者小白",
        passwordHash: await bcrypt.hash(userPassword, 10),
        role: "user",
        credits: 5_000
      }
    })
  ]);

  const models: AiModel[] = [];

  for (const provider of seedProviders) {
    const encrypted = provider.apiKey ? encryptSecret(provider.apiKey) : "";
    const createdProvider = await prisma.provider.create({
      data: {
        slug: provider.slug,
        name: provider.name,
        baseURL: provider.baseURL,
        apiKeyEncrypted: encrypted,
        extraHeaders: serializeProviderHeaders(provider.extraHeaders ?? {}),
        enabled: true
      }
    });

    for (const model of provider.models) {
      const created = await prisma.aiModel.create({
        data: {
          slug: model.slug,
          displayName: model.displayName,
          providerId: createdProvider.id,
          family: model.family,
          modalities: JSON.stringify(model.modalities),
          supportsStream: model.supportsStream,
          pricing: JSON.stringify(model.pricing),
          rateLimit: JSON.stringify(model.rateLimit),
          tags: JSON.stringify(model.tags),
          enabled: true,
          sort: model.sort
        }
      });

      models.push(created);
    }
  }

  for (const asset of seedAssets) {
    const hotScore = calculateHotScore({
      likes: asset.likes,
      views: asset.views,
      createdAt: asset.createdAt
    });

    await prisma.asset.create({
      data: {
        title: asset.title,
        type: asset.type,
        coverUrl: asset.coverUrl,
        videoUrl: asset.videoUrl,
        aspectRatio: asset.aspectRatio,
        durationSec: asset.durationSec,
        modelTag: asset.modelTag,
        tags: JSON.stringify(asset.tags),
        likes: asset.likes,
        views: asset.views,
        hotScore,
        createdAt: asset.createdAt,
        updatedAt: asset.createdAt
      }
    });
  }

  const firstModel = models[0];
  if (firstModel) {
    await prisma.creditTransaction.create({
      data: {
        userId: regularUser.id,
        providerId: firstModel.providerId,
        providerSlug: seedProviders[0]?.slug,
        modelId: firstModel.id,
        modelSlug: firstModel.slug,
        delta: -120,
        reason: "首单对话预扣",
        status: "success",
        metadata: JSON.stringify({
          promptTokens: 1024,
          completionTokens: 512
        })
      }
    });
  }

  return { admin, user: regularUser, models };
}
