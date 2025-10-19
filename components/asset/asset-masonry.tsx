"use client";

import type { AssetListItem } from "@/lib/assets";

import { AssetCard } from "./asset-card";

export type AssetMasonryProps = {
  assets: AssetListItem[];
  onToggleFavorite?: (assetId: string, nextState: boolean) => Promise<void>;
  isAuthenticated?: boolean;
  userCredits?: number;
};

export function AssetMasonry({ assets, onToggleFavorite, isAuthenticated, userCredits }: AssetMasonryProps) {
  if (assets.length === 0) {
    return (
<div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-default py-24 text-muted-foreground">
        暂无作品，换个筛选条件试试。
      </div>
    );
  }

  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onToggleFavorite={onToggleFavorite}
          isAuthenticated={isAuthenticated}
          userCredits={userCredits}
        />
      ))}
    </div>
  );
}
