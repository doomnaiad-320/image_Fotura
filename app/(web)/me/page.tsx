import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { AssetListItem } from "@/lib/assets";
import { MeDashboard } from "@/components/me/me-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "个人主页 · AIGC Studio",
  description: "我的收藏与已复用"
};

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin?redirect=/me");

  // 已应用（已购买）列表
  const reused = await prisma.reuseRecord.findMany({
    where: { reuserId: user.id },
    include: {
      sourceWork: {
        include: {
          favorites: {
            where: { userId: user.id },
            select: { id: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const reusedItems: AssetListItem[] = reused
    .map((r) => r.sourceWork)
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => {
      const tags = Array.isArray(a.tags)
        ? (a.tags as string[])
        : typeof a.tags === "string"
        ? JSON.parse(a.tags || "[]")
        : [];
      const isFavorited = Array.isArray((a as any).favorites) && (a as any).favorites.length > 0;
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
        isFavorited,
        prompt: a.prompt,
        userId: a.userId,
        model: a.model,
        modelName: a.modelName,
        size: a.size,
        mode: a.mode,
        reusePoints: a.reusePoints ?? 50,
      };
    });

  // 我的收藏列表（过滤已删除作品）
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, asset: { isDeleted: false } },
    include: { asset: true },
    orderBy: { createdAt: "desc" }
  });

  const favoriteItems: AssetListItem[] = favorites.map((f) => {
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
      prompt: a.prompt,
      userId: a.userId,
      model: a.model,
      modelName: a.modelName,
      size: a.size,
      mode: a.mode,
      reusePoints: a.reusePoints ?? 50,
    };
  });

  // 我发布的作品（不含已删除）
  const published = await prisma.asset.findMany({
    where: { userId: user.id, isDeleted: false },
    orderBy: { createdAt: "desc" }
  });

  const publishedItems: AssetListItem[] = published.map((a) => {
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
      isFavorited: false,
      prompt: a.prompt,
      userId: a.userId,
      model: a.model,
      modelName: a.modelName,
      size: a.size,
      mode: a.mode,
      reusePoints: a.reusePoints ?? 50,
    };
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">个人主页</h1>
        <p className="text-sm text-muted-foreground">已发布 · 已应用 · 收藏</p>
      </header>

      <MeDashboard
        published={publishedItems}
        reused={reusedItems}
        favorites={favoriteItems}
      />
    </div>
  );
}
