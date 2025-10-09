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

  const where: Prisma.AssetWhereInput = {};

  if (type !== "all") {
    where.type = type;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { modelTag: { contains: search, mode: "insensitive" } }
    ];
  }

  const orderBy: Prisma.AssetOrderByWithRelationInput[] =
    sort === "hot"
      ? [{ hotScore: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const assets = await prisma.asset.findMany({
    where,
    orderBy,
    include: userId
      ? {
          favorites: {
            where: {
              userId
            },
            select: {
              id: true
            }
          }
        }
      : undefined,
    take: limit + 1,
    skip: cursor ? 1 : undefined,
    cursor: cursor ? { id: cursor } : undefined
  });

  let nextCursor: string | null = null;

  if (assets.length > limit) {
    const nextItem = assets.pop();
    nextCursor = nextItem?.id ?? null;
  }

  const items: AssetListItem[] = assets.map((asset) => {
    const parsedTags = Array.isArray(asset.tags) ? (asset.tags as string[]) : [];
    const favorites = (asset as AssetWithFavorite).favorites ?? [];

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
      isFavorited: userId ? favorites.length > 0 : false
    };
  });

  return {
    items,
    nextCursor
  };
}
