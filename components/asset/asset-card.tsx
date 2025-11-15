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
  compact?: boolean;
};

export function AssetCard({ asset, onToggleFavorite, isAuthenticated, userCredits = 0, compact = false }: AssetCardProps) {
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

  if (compact) {
    // 紧凑模式：只显示图片和基本信息
    return (
<article className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
              width={640}
              height={640 / asset.aspectRatio}
              className="h-auto w-full object-cover"
            />
          )}
          <div className="absolute left-2 top-2 flex items-center gap-2">
            <Badge className="border-border bg-muted/90 text-foreground backdrop-blur-sm text-[10px]">
              {asset.type === "video" ? "视频" : "图片"}
            </Badge>
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
              {asset.reusePoints === 0 ? "免费应用" : `应用 ${asset.reusePoints} 积分`}
            </span>
          </div>
        </div>
        <div className="px-3 py-3">
<h3 className="line-clamp-2 text-sm font-medium leading-tight text-foreground">{asset.title}</h3>
        </div>
      </article>
    );
  }

  return (
<article className="mb-6 break-inside-avoid overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      {/* 图片区域 */}
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

        {/* 顶部价签（轻微倾斜） */}
        <div className="absolute right-3 top-3 origin-top-right -rotate-2">
          <span className="inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-black shadow-md">
            {asset.reusePoints === 0 ? "免费应用" : `应用 ${asset.reusePoints} 积分`}
          </span>
        </div>

        {/* 底部信息条：标题 + 类型 + 模型，标题浮在图片上 */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-3 pb-3 pt-4">
          <p className="line-clamp-2 text-[13px] sm:text-sm font-semibold leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {asset.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/85">
              {asset.type === "video" ? "视频" : "图片"}
            </span>
            <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-white/80">
              {asset.modelTag}
            </span>
          </div>
        </div>
      </div>

      {/* 信息区 */}
      <div className="space-y-3 px-4 py-4">
        {/* 标签（可选） */}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {asset.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
className="rounded-full border border-border px-3 py-1 uppercase tracking-[0.2em]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            variant={favorited ? "primary" : "secondary"}
            className={cn(
              "flex-1 min-h-[38px] rounded-full text-xs font-medium",
              favorited && "bg-white text-black"
            )}
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
