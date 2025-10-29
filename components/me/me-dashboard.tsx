"use client";

import { useMemo, useState } from "react";

import type { AssetListItem } from "@/lib/assets";
import { PublishedGrid } from "@/components/asset/published-grid";
import { ReusedThumbGrid } from "@/components/asset/reused-thumb-grid";
import { FavoritesThumbGrid } from "@/components/asset/favorites-thumb-grid";
import { ConsumptionHistory } from "@/components/settings/consumption-history";

export type MeDashboardProps = {
  published: AssetListItem[];
  reused: AssetListItem[];
  favorites: AssetListItem[];
};

const tabs = [
  { key: "published", label: "已发布" },
  { key: "reused", label: "已复用" },
  { key: "favorites", label: "收藏" },
  { key: "consumption", label: "消费日志" }
] as const;

export function MeDashboard({ published, reused, favorites }: MeDashboardProps) {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("published");

  const counts = useMemo(() => ({
    published: published.length,
    reused: reused.length,
    favorites: favorites.length,
    consumption: '' // 不显示数量
  }), [published.length, reused.length, favorites.length]);

  return (
    <div className="space-y-6">
      {/* 移动端顶部标签栏 */}
      <div className="md:hidden sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 py-3">
          {tabs.map((t) => {
            const selected = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border ${selected ? "bg-foreground text-background border-foreground" : "bg-surface-2 text-foreground border-default"}`}
                aria-selected={selected}
              >
                <span>{t.label}</span>
                {counts[t.key] !== '' && <span className="ml-1 text-xs opacity-75">{counts[t.key]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 桌面端：左侧导航 + 右侧内容 */}
      <div className="hidden md:grid md:grid-cols-[220px,1fr] md:gap-6">
        <aside className="rounded-2xl border border-default bg-surface p-3">
          <nav className="flex flex-col gap-2">
            {tabs.map((t) => {
              const selected = active === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium border text-left transition ${selected ? "bg-orange-600 text-white border-orange-600" : "bg-surface-2 text-foreground border-default hover:bg-surface-3"}`}
                >
                  <span>{t.label}</span>
                  {counts[t.key] !== '' && <span className={`ml-2 text-xs ${selected ? "text-white/80" : "opacity-75"}`}>{counts[t.key]}</span>}
                </button>
              );
            })}
          </nav>
        </aside>
        <section className="space-y-4">
          {active === "published" && (
            <PublishedGrid initialItems={published} isAuthenticated={true} />
          )}
          {active === "reused" && (
            <ReusedThumbGrid initialItems={reused} isAuthenticated={true} />
          )}
          {active === "favorites" && (
            <FavoritesThumbGrid initialItems={favorites} isAuthenticated={true} />
          )}
          {active === "consumption" && (
            <ConsumptionHistory />
          )}
        </section>
      </div>

      {/* 移动端：按标签切换内容 */}
      <div className="md:hidden">
        {active === "published" && (
          <PublishedGrid initialItems={published} isAuthenticated={true} />
        )}
        {active === "reused" && (
          <ReusedThumbGrid initialItems={reused} isAuthenticated={true} />
        )}
        {active === "favorites" && (
          <FavoritesThumbGrid initialItems={favorites} isAuthenticated={true} />
        )}
        {active === "consumption" && (
          <ConsumptionHistory />
        )}
      </div>
    </div>
  );
}
