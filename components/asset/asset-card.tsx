"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AssetListItem } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type AssetCardProps = {
  asset: AssetListItem;
  onToggleFavorite?: (assetId: string, nextState: boolean) => Promise<void>;
  isAuthenticated?: boolean;
};

export function AssetCard({ asset, onToggleFavorite, isAuthenticated }: AssetCardProps) {
  const router = useRouter();
  const [optimisticFavorite, setOptimisticFavorite] = useState(asset.isFavorited);
  const favorited = optimisticFavorite;

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/`);
      return;
    }

    if (!onToggleFavorite) {
      return;
    }

    const nextState = !favorited;
    setOptimisticFavorite(nextState);
    try {
      await onToggleFavorite(asset.id, nextState);
    } catch (error) {
      console.error(error);
      setOptimisticFavorite(!nextState);
    }
  };

  const handleReuse = () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/`);
      return;
    }
    router.push(`/studio?asset=${asset.id}`);
  };

  return (
    <article className="mb-6 break-inside-avoid overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow shadow-black/20 transition hover:-translate-y-1 hover:border-white/20">
      <div className="relative w-full overflow-hidden">
        {asset.type === "video" ? (
          <video
            className="h-full w-full"
            style={{ aspectRatio: asset.aspectRatio }}
            poster={asset.coverUrl}
            src={asset.videoUrl ?? undefined}
            controls
            preload="metadata"
          />
        ) : (
          <Image
            src={asset.coverUrl}
            alt={asset.title}
            width={960}
            height={960 / asset.aspectRatio}
            className="h-auto w-full object-cover"
          />
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2 text-xs font-medium">
          <Badge className="border-white/40 bg-black/50 text-white">
            {asset.type === "video" ? "视频" : "图片"}
          </Badge>
          <span className="rounded-full bg-black/70 px-3 py-1 text-[11px] tracking-wide text-gray-200">
            {asset.modelTag}
          </span>
        </div>
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold leading-tight text-white">{asset.title}</h3>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {asset.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            热度 <strong className="text-white">{asset.hotScore.toFixed(1)}</strong>
          </span>
          <span>
            👍 {asset.likes} · 👁️ {asset.views}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant={favorited ? "primary" : "secondary"}
            className={cn("flex-1", favorited && "bg-white text-black")}
            onClick={handleFavorite}
          >
            {favorited ? "已收藏" : "收藏"}
          </Button>
          <Button variant="ghost" className="flex-1" onClick={handleReuse}>
            复用
          </Button>
        </div>
      </div>
    </article>
  );
}
