"use client";

import { useMemo } from "react";
import toast from "react-hot-toast";

import type { AssetListItem } from "@/lib/assets";
import { AssetMasonry } from "@/components/asset/asset-masonry";

export type ReusedGridProps = {
  initialItems: AssetListItem[];
  isAuthenticated: boolean;
};

export function ReusedGrid({ initialItems, isAuthenticated }: ReusedGridProps) {
  const items = initialItems;

  const onToggleFavorite = async (assetId: string, nextState: boolean) => {
    const res = await fetch("/api/favorites/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, active: nextState })
    });
    if (!res.ok) {
      toast.error("操作失败");
      throw new Error("收藏操作失败");
    }
    toast.success(nextState ? "已收藏" : "已取消收藏");
  };

  const memoItems = useMemo(() => items, [items]);

  return (
    <AssetMasonry
      assets={memoItems}
      onToggleFavorite={onToggleFavorite}
      isAuthenticated={isAuthenticated}
    />
  );
}
