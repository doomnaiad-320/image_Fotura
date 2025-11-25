import type { Prisma } from "@prisma/client";

export type AssetWithMeta = Prisma.AssetGetPayload<{
  include: {
    favorites: {
      select: { id: true };
    };
    _count: {
      select: { reuseRecords: true };
    };
  };
}>;

export const buildPrefill = (asset: AssetWithMeta) => ({
  prompt: asset.prompt ?? "",
  modelSlug: asset.model ?? "",
  modelName: asset.modelName ?? "",
  size: asset.size ?? "1024x1024",
  mode: asset.mode ?? "txt2img",
  coverUrl: asset.coverUrl,
  aspectRatio: asset.aspectRatio ?? 1
});

export const serializeAsset = (asset: AssetWithMeta, viewerId?: string | null) => {
  const tags = Array.isArray(asset.tags)
    ? (asset.tags as string[])
    : typeof asset.tags === "string"
      ? (() => {
          try {
            return JSON.parse(asset.tags || "[]");
          } catch {
            return [];
          }
        })()
      : [];

  return {
    id: asset.id,
    title: asset.title,
    prompt: asset.prompt ?? "",
    modelSlug: asset.model ?? "",
    modelName: asset.modelName ?? "",
    size: asset.size ?? "1024x1024",
    mode: asset.mode ?? "txt2img",
    coverUrl: asset.coverUrl,
    aspectRatio: asset.aspectRatio ?? 1,
    tags,
    isPublic: asset.isPublic,
    shareCost: asset.reusePoints ?? 0,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    isFavorited: Boolean(asset.favorites?.length),
    reuseCount: asset._count?.reuseRecords ?? 0,
    ownerId: asset.userId,
    prefill: buildPrefill(asset),
    reusedAt: null
  };
};
