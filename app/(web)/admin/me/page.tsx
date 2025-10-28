"use client";

import useSWR from "swr";

import { PublishedGrid } from "@/components/asset/published-grid";
import { ReusedThumbGrid } from "@/components/asset/reused-thumb-grid";
import { FavoritesThumbGrid } from "@/components/asset/favorites-thumb-grid";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminMePage() {
  const { data, isLoading, mutate } = useSWR("/api/me/overview", fetcher, {
    refreshInterval: 60_000
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">个人主页</h1>
        <Button variant="secondary" size="sm" onClick={() => mutate()}>刷新</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="space-y-3 xl:col-span-1">
          <h3 className="text-sm text-muted-foreground">已发布</h3>
          <PublishedGrid initialItems={(data?.published ?? []) as any} isAuthenticated={true} />
        </section>
        <section className="space-y-3 xl:col-span-1">
          <h3 className="text-sm text-muted-foreground">已复用</h3>
          <ReusedThumbGrid initialItems={(data?.reused ?? []) as any} isAuthenticated={true} />
        </section>
        <section className="space-y-3 xl:col-span-1">
          <h3 className="text-sm text-muted-foreground">收藏</h3>
          <FavoritesThumbGrid initialItems={(data?.favorites ?? []) as any} isAuthenticated={true} />
        </section>
      </div>
      {isLoading && (
        <div className="text-sm text-muted-foreground">加载中...</div>
      )}
    </div>
  );
}
