"use client";

import useSWR from "swr";
import { FavoritesThumbGrid } from "@/components/asset/favorites-thumb-grid";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminMeFavoritesPage() {
  const { data } = useSWR("/api/me/overview", fetcher);
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">收藏</h1>
      <FavoritesThumbGrid initialItems={(data?.favorites ?? []) as any} isAuthenticated={true} />
    </div>
  );
}
