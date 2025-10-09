import type { Metadata } from "next";

import { AIPlayground } from "@/components/ai/playground";
import { AssetFeed } from "@/components/asset/asset-feed";
import { listEnabledModelsForPlayground } from "@/lib/ai/models";
import { getAssets } from "@/lib/assets";
import { getCurrentUser } from "@/lib/auth";
import { assetQuerySchema } from "@/lib/validators/assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIGC Studio · 灵感瀑布",
  description: "浏览热门与最新 AIGC 作品，探索多模态灵感"
};

export default async function HomePage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const parsed = assetQuerySchema.parse({
    type: typeof searchParams?.type === "string" ? searchParams.type : undefined,
    sort: typeof searchParams?.sort === "string" ? searchParams.sort : undefined,
    cursor: typeof searchParams?.cursor === "string" ? searchParams.cursor : undefined
  });

  const sessionUser = await getCurrentUser();
  const [assetResult, playgroundModels] = await Promise.all([
    getAssets({
      type: parsed.type,
      sort: parsed.sort,
      cursor: parsed.cursor,
      limit: 12,
      userId: sessionUser?.id ?? null
    }),
    listEnabledModelsForPlayground()
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          灵感瀑布
        </h1>
        <p className="max-w-2xl text-sm text-gray-400 md:text-base">
          瀑布流布局实时汇聚社区最热门、最新的 AIGC 作品。支持类型筛选与排序，快速收藏并复用灵感模版。
        </p>
      </section>
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">创作工作台</h2>
          <p className="text-sm text-gray-400">
            不离开首页即可尝试最新模型，实时生成你的灵感草稿。
          </p>
        </div>
        <AIPlayground models={playgroundModels} isAuthenticated={Boolean(sessionUser)} />
      </section>
      <AssetFeed
        initialItems={assetResult.items}
        initialCursor={assetResult.nextCursor}
        initialState={{ type: parsed.type, sort: parsed.sort }}
        isAuthenticated={Boolean(sessionUser)}
      />
    </div>
  );
}
