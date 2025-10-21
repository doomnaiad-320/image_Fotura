"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type { AssetListItem } from "@/lib/assets";
import { AssetMasonry } from "@/components/asset/asset-masonry";

export type FavoritesGridProps = {
  initialItems: AssetListItem[];
  isAuthenticated: boolean;
};

export function FavoritesGrid({ initialItems, isAuthenticated }: FavoritesGridProps) {
  const [items, setItems] = useState<AssetListItem[]>(initialItems);

  const onToggleFavorite = useCallback(async (assetId: string, nextState: boolean) => {
    const res = await fetch("/api/favorites/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, active: nextState })
    });
    if (!res.ok) {
      toast.error("操作失败");
      throw new Error("收藏操作失败");
    }
    if (!nextState) {
      setItems((prev) => prev.filter((i) => i.id !== assetId));
    }
    toast.success(nextState ? "已收藏" : "已取消收藏");
  }, []);

  const memoItems = useMemo(() => items, [items]);

  return (
    <AssetMasonry
      assets={memoItems}
      onToggleFavorite={onToggleFavorite}
      isAuthenticated={isAuthenticated}
    />
  );
}