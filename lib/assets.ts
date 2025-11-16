import { AssetType, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AssetSort = "hot" | "new";

export type AssetQuery = {
  limit?: number;
  cursor?: string | null;
  type?: AssetType | "all";
  sort?: AssetSort;
  userId?: string | null;
  search?: string;
};

export type AssetListItem = {
  id: string;
  title: string;
  type: AssetType;
  coverUrl: string;
  videoUrl?: string | null;
  aspectRatio: number;
  durationSec?: number | null;
  modelTag: string;
  tags: string[];
  views: number;
  likes: number;
  hotScore: number;
  createdAt: Date;
  isFavorited: boolean;
  // 分类信息（可选）
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  // AI 生成相关信息 (可选)
  prompt?: string | null;
  userId?: string | null;
  model?: string | null;
  modelName?: string | null;
  size?: string | null;
  mode?: string | null;
  reusePoints: number;
};

export type AssetListResponse = {
  items: AssetListItem[];
  nextCursor: string | null;
};

type AssetWithFavorite = Prisma.AssetGetPayload<{
  include: {
    favorites: {
      select: {
        id: true;
      };
    };
    category: true;
  };
}>;

export async function getAssets(query: AssetQuery = {}): Promise<AssetListResponse> {
  const {
    limit = 12,
    cursor,
    type = "all",
    sort = "hot",
    userId,
    search
  } = query;

  // 基础查询条件
  const baseWhere: Prisma.AssetWhereInput = {
    isPublic: true,
    isDeleted: false
  };

  if (type !== "all") {
    baseWhere.type = type;
  }

  if (search) {
    baseWhere.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { modelTag: { contains: search, mode: "insensitive" } }
    ];
  }

  // 排序规则
  const orderBy: Prisma.AssetOrderByWithRelationInput[] =
    sort === "hot"
      ? [{ hotScore: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  // 第一步：优先查询用户发布的真实内容（userId 不为 null）
  const realAssetsWhere: Prisma.AssetWhereInput = {
    ...baseWhere,
    userId: { not: null }
  };

  const realInclude: any = {
    category: true
  };
  if (userId) {
    realInclude.favorites = {
      where: { userId },
      select: { id: true }
    };
  }

  const realAssets = await prisma.asset.findMany({
    where: realAssetsWhere,
    orderBy,
    include: realInclude,
    take: limit + 1,
    skip: cursor ? 1 : undefined,
    cursor: cursor ? { id: cursor } : undefined
  });

  let assets = realAssets;
  let nextCursor: string | null = null;

  // 如果真实内容不足，补充占位图片（仅在无 cursor 时）
  if (!cursor && realAssets.length < limit) {
    const placeholderWhere: Prisma.AssetWhereInput = {
      ...baseWhere,
      userId: null
    };

    const placeholderInclude: any = {
      category: true
    };
    if (userId) {
      placeholderInclude.favorites = {
        where: { userId },
        select: { id: true }
      };
    }

    const placeholders = await prisma.asset.findMany({
      where: placeholderWhere,
      orderBy,
      include: placeholderInclude,
      take: limit - realAssets.length + 1
    });

    assets = [...realAssets, ...placeholders];
  }

  // 处理分页
  if (assets.length > limit) {
    const nextItem = assets.pop();
    nextCursor = nextItem?.id ?? null;
  }

  // 映射数据
  const items: AssetListItem[] = assets.map((asset) => {
    const parsedTags = Array.isArray(asset.tags) ? (asset.tags as string[]) : [];
    const withRelations = asset as AssetWithFavorite;
    const favorites = withRelations.favorites ?? [];
    const category = withRelations.category ?? null;

    return {
      id: asset.id,
      title: asset.title,
      type: asset.type,
      coverUrl: asset.coverUrl,
      videoUrl: asset.videoUrl,
      aspectRatio: asset.aspectRatio,
      durationSec: asset.durationSec,
      modelTag: asset.modelTag,
      tags: parsedTags,
      views: asset.views,
      likes: asset.likes,
      hotScore: asset.hotScore,
      createdAt: asset.createdAt,
      isFavorited: userId ? favorites.length > 0 : false,
      // 分类信息
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      // AI 生成相关信息
      prompt: asset.prompt,
      userId: asset.userId,
      model: asset.model,
      modelName: asset.modelName,
      size: asset.size,
      mode: asset.mode,
      reusePoints: asset.reusePoints ?? 50
    };
  });

  return {
    items,
    nextCursor
  };
}
