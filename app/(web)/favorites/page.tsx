import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { AssetListItem } from "@/lib/assets";
import { FavoritesGrid } from "@/components/asset/favorites-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的收藏 · AIGC Studio",
  description: "查看并管理你收藏的作品"
};

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin?redirect=/favorites");
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { asset: true },
    orderBy: { createdAt: "desc" }
  });

  const items: AssetListItem[] = favorites.map((f) => {
    const a = f.asset;
    const tags = Array.isArray(a.tags) ? (a.tags as string[]) : typeof a.tags === "string" ? JSON.parse(a.tags || "[]") : [];
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
      reusePoints: a.reusePoints ?? 50
    };
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">我的收藏</h1>
        <p className="text-sm text-muted-foreground">你收藏的作品会出现在这里</p>
      </header>

      <FavoritesGrid initialItems={items} isAuthenticated={true} />
    </div>
  );
}