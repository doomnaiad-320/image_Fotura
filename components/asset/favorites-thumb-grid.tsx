"use client";

import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

import type { AssetListItem } from "@/lib/assets";

export type FavoritesThumbGridProps = {
  initialItems: AssetListItem[];
  isAuthenticated: boolean;
};

export function FavoritesThumbGrid({ initialItems, isAuthenticated }: FavoritesThumbGridProps) {
  const [items, setItems] = useState<AssetListItem[]>(initialItems);

  const onToggleFavorite = useCallback(async (assetId: string, nextState: boolean) => {
    const res = await fetch("/api/favorites/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, active: nextState })
    });
    if (!res.ok) {
      toast.error("操作失败");
      return;
    }
    if (!nextState) {
      setItems((prev) => prev.filter((i) => i.id !== assetId));
    }
    toast.success(nextState ? "已收藏" : "已取消收藏");
  }, []);

  const memoItems = useMemo(() => items, [items]);

  if (memoItems.length === 0) {
    return (
      <div className="grid min-h-[200px] place-items-center rounded-3xl border border-dashed border-default py-12 text-muted-foreground">
        暂无收藏。
      </div>
    );
  }

  return (
    <ul className="divide-y divide-default rounded-2xl border border-default bg-surface">
      {memoItems.map((a) => (
        <li key={a.id} className="flex items-center gap-3 p-3">
          <div className="relative h-[100px] w-[100px] overflow-hidden rounded-lg border border-default bg-surface-2 flex-shrink-0">
            {a.videoUrl ? (
              <video className="h-full w-full object-cover" poster={a.coverUrl} src={a.videoUrl ?? undefined} preload="metadata" muted />
            ) : (
              <Image src={a.coverUrl} alt={a.title} width={100} height={100} className="h-[100px] w-[100px] object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{a.modelTag}</div>
              </div>
              <div className="flex gap-2">
                <a className="rounded-xl border border-default bg-surface-2 px-3 py-2 text-center text-sm" href={`/assets/${a.id}`}>查看</a>
                <button
                  className={`rounded-xl px-3 py-2 text-sm font-semibold border ${a.isFavorited ? "bg-white text-black" : "bg-foreground text-background"}`}
                  onClick={() => onToggleFavorite(a.id, !a.isFavorited)}
                >
                  {a.isFavorited ? "已收藏" : "收藏"}
                </button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
