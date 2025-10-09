"use client";

import { useEffect, useState } from "react";

import { AssetCard } from "@/components/asset/asset-card";
import { Button } from "@/components/ui/button";
import type { AssetListItem, AssetListResponse } from "@/lib/assets";
import { httpFetch } from "@/lib/http";

const DEFAULT_REMOTE_ENDPOINT = "/api/assets?type=all&sort=hot";

export default function MobileShellPage() {
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await httpFetch<AssetListResponse>(DEFAULT_REMOTE_ENDPOINT);
        if (!active) return;
        setAssets(response.items);
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="sticky top-0 border-b border-white/10 px-4 py-3 text-center text-xs uppercase tracking-[0.3em] text-gray-400">
        AIGC Studio · Mobile
      </header>
      <main className="flex-1 space-y-6 px-4 py-6">
        <section className="space-y-2">
          <h1 className="text-lg font-semibold">远程灵感流</h1>
          <p className="text-xs text-gray-500">
            移动端仅在客户端渲染，并通过 NEXT_PUBLIC_API_BASE_URL 指定的远程接口获取数据。
          </p>
        </section>

        {loading && (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="space-y-3 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>数据拉取失败：{error}</p>
            <Button variant="secondary" size="sm" onClick={() => location.reload()}>
              重试
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} isAuthenticated={false} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
