"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AssetListItem } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReuseButton } from "@/components/asset/reuse-button";

export type AssetCardProps = {
  asset: AssetListItem;
  onToggleFavorite?: (assetId: string, nextState: boolean) => Promise<void>;
  isAuthenticated?: boolean;
  userCredits?: number;
};

export function AssetCard({ asset, onToggleFavorite, isAuthenticated, userCredits = 0 }: AssetCardProps) {
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


  const handleViewDetail = () => {
    router.push(`/assets/${asset.id}`);
  };

  return (
<article className="mb-6 break-inside-avoid overflow-hidden rounded-3xl border border-default bg-surface shadow transition hover:-translate-y-1">
      <div 
        className="relative w-full overflow-hidden cursor-pointer" 
        onClick={handleViewDetail}
      >
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
<Badge className="border-default bg-surface-2 text-foreground">
            {asset.type === "video" ? "视频" : "图片"}
          </Badge>
<span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] tracking-wide text-foreground border border-default">
            {asset.modelTag}
          </span>
        </div>
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="space-y-2">
<h3 className="text-lg font-semibold leading-tight text-foreground">{asset.title}</h3>
<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {asset.tags.map((tag) => (
              <span
                key={tag}
className="rounded-full border border-default px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
<div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
热度 <strong className="text-foreground">{asset.hotScore.toFixed(1)}</strong>
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
          <ReuseButton
            assetId={asset.id}
            assetTitle={asset.title}
            isAuthenticated={isAuthenticated ?? false}
            userCredits={userCredits}
            reusePoints={asset.reusePoints}
          />
        </div>
      </div>
    </article>
  );
}
