"use client";

import React, { useEffect, useState } from "react";
import type { AssetListItem } from "@/lib/assets";
import { FavoritesGrid } from "@/components/asset/favorites-grid";
import { httpFetch } from "@/lib/http";

export function FavoritesPanel() {
  const [items, setItems] = useState<AssetListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await httpFetch<{ items: AssetListItem[] }>("/api/favorites/list");
        if (!active) return;
        setItems(res.items);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "加载失败");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="border border-red-500/50 bg-red-500/10 rounded-lg p-4 text-sm text-red-600">{error}</div>
    );
  }

  if (!items) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl border border-default bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">我的收藏</h2>
      <FavoritesGrid initialItems={items} isAuthenticated={true} />
    </div>
  );
}