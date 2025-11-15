"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AssetListItem } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReuseButton } from "@/components/asset/reuse-button";

export type AssetCardBProps = {
  asset: AssetListItem;
  onToggleFavorite?: (assetId: string, nextState: boolean) => Promise<void>;
  isAuthenticated?: boolean;
  userCredits?: number;
  compact?: boolean;
};

export function AssetCardB({ asset, onToggleFavorite, isAuthenticated, userCredits = 0, compact = false }: AssetCardBProps) {
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
    // 紧凑模式：与原版保持接近，仅做轻微优化
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
        </div>
        <div className="px-3 py-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight text-foreground">{asset.title}</h3>
        </div>
      </article>
    );
  }

  return (
    <article className="mb-6 break-inside-avoid overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      {/* 图片区域：仅展示模型信息 */}
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
            {asset.reusePoints === 0
              ? "灵感免费解锁"
              : `解锁灵感 · ${asset.reusePoints} 积分`}
          </span>
        </div>

        {/* 底部模型胶囊 + 类型 */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <span className="inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
              {asset.modelName || asset.modelTag}
            </span>
            <span className="inline-flex items-center rounded-full bg-black/50 px-3 py-1 text-[10px] text-white/85 backdrop-blur-sm">
              {asset.type === "video" ? "视频" : "图片"}
            </span>
          </div>
        </div>
      </div>

        {/* 信息区：标题放在卡片下半部分 */}
      <div className="space-y-3 px-4 py-4">
        <h3 className="line-clamp-2 text-[17px] md:text-[18px] font-semibold leading-snug text-foreground">
          {asset.title}
        </h3>

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
              favorited && "bg-white text-black",
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

export default AssetCardB;
