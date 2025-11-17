import type { AssetType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AssetSort = "hot" | "new";

export type AssetQuery = {
  limit?: number;
  cursor?: string | null;
  type?: AssetType | "all";
  sort?: AssetSort;
  userId?: string | null;
  search?: string;
  categoryId?: string | null;
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
  categoryParentId?: string | null;
  categoryParentName?: string | null;
  categoryParentSlug?: string | null;
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
    category: {
      include: {
        parent: true;
      };
    };
  };
}>;

export async function getAssets(query: AssetQuery = {}): Promise<AssetListResponse> {
  const {
    limit = 12,
    cursor,
    type = "all",
    sort = "hot",
    userId,
    search,
    categoryId
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

  if (categoryId) {
    baseWhere.categoryId = categoryId;
  }

  // 排序规则（保留热门/最新逻辑）
  const orderBy: Prisma.AssetOrderByWithRelationInput[] =
    sort === "hot"
      ? [{ hotScore: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  // 作品列表：目前对所有公开且未删除的作品开放（包括管理员示例、历史作品等）
  // 如需区分 seed 占位图，可在未来增加专门标记字段再过滤
  const realAssetsWhere: Prisma.AssetWhereInput = baseWhere;

  const include: Prisma.AssetInclude = {
    category: {
      include: {
        parent: true
      }
    }
  };
  if (userId) {
    include.favorites = {
      where: { userId },
      select: { id: true }
    };
  }

  const records = await prisma.asset.findMany({
    where: realAssetsWhere,
    orderBy,
    include,
    take: limit + 1,
    skip: cursor ? 1 : undefined,
    cursor: cursor ? { id: cursor } : undefined
  });

  const assets = records;
  let nextCursor: string | null = null;

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
    const parentCategory = category?.parent ?? null;

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
      categoryParentId: parentCategory?.id ?? null,
      categoryParentName: parentCategory?.name ?? null,
      categoryParentSlug: parentCategory?.slug ?? null,
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
