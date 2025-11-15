"use client";

import type { AssetListItem } from "@/lib/assets";

// 临时使用方案 B 卡片进行视觉对比，如需切回方案 A 改回为 ./asset-card
import { AssetCardB as AssetCard } from "./asset-card-b";

export type AssetMasonryProps = {
  assets: AssetListItem[];
  onToggleFavorite?: (assetId: string, nextState: boolean) => Promise<void>;
  isAuthenticated?: boolean;
  userCredits?: number;
  compact?: boolean;
};

export function AssetMasonry({ assets, onToggleFavorite, isAuthenticated, userCredits, compact = false }: AssetMasonryProps) {
  if (assets.length === 0) {
    return (
<div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-default py-24 text-muted-foreground">
        暂无作品，换个筛选条件试试。
      </div>
    );
  }

  return (
    <div className={compact ? "columns-2 gap-4 sm:columns-3 lg:columns-4" : "columns-1 gap-6 sm:columns-2 lg:columns-3"}>
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onToggleFavorite={onToggleFavorite}
          isAuthenticated={isAuthenticated}
          userCredits={userCredits}
          compact={compact}
        />
      ))}
    </div>
  );
}
