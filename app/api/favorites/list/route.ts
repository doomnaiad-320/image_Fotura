import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AssetListItem } from "@/lib/assets";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "未登录" }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { asset: true },
    orderBy: { createdAt: "desc" },
  });

  const items: AssetListItem[] = favorites.map((f) => {
    const a = f.asset;
    const tags = Array.isArray(a.tags)
      ? (a.tags as string[])
      : typeof a.tags === "string"
      ? JSON.parse(a.tags || "[]")
      : [];
    return {
      id: a.id,
      title: a.title,
      type: a.type as any,
      coverUrl: a.coverUrl,
      videoUrl: a.videoUrl,
      aspectRatio: a.aspectRatio,
      durationSec: a.durationSec,
      modelTag: a.modelTag,
      tags,
      views: a.views,
      likes: a.likes,
      hotScore: a.hotScore,
      createdAt: a.createdAt,
      isFavorited: true,
      categoryId: (a as any).categoryId ?? null,
      categoryName: null,
      categorySlug: null,
      prompt: a.prompt,
      userId: a.userId,
      model: a.model,
      modelName: a.modelName,
      size: a.size,
      mode: a.mode,
      reusePoints: a.reusePoints ?? 50,
    };
  });

  return NextResponse.json({ items });
}