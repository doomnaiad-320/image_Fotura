import type { Metadata } from "next";

import { AssetMasonry } from "@/components/asset/asset-masonry";
import { Button } from "@/components/ui/button";
import { getAssets } from "@/lib/assets";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIGC Studio · 探索页",
  description: "通过标签、模型与能力维度多选筛选你的目标作品"
};

const PLACEHOLDER_FILTERS = [
  {
    title: "模型能力",
    options: ["对话", "图像生成", "图像编辑", "视频生成"],
    description: "支持多模型并行，后续将开放能力组合筛选"
  },
  {
    title: "创作风格",
    options: ["科幻", "国风", "插画", "商业海报", "角色设计"],
    description: "选项占位，未来将基于标签动态生成"
  },
  {
    title: "时长 / 尺寸",
    options: ["<30s", "30-60s", ">60s", "方形", "竖屏", "横屏"],
    description: "支持视频时长与画幅筛选，将接入 /api/assets 参数"
  }
];

export default async function ExplorePage() {
  const [user, assetResult] = await Promise.all([
    getCurrentUser(),
    getAssets({ limit: 18, sort: "new" })
  ]);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
<h1 className="text-3xl font-semibold text-foreground md:text-4xl">探索更多维度</h1>
<p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          筛选面板暂为占位，后续将和后端参数解耦对接，实现多模型、多标签、多尺寸等组合筛选。当前列表展示最新作品快照。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {PLACEHOLDER_FILTERS.map((filter) => (
          <div
            key={filter.title}
className="space-y-3 rounded-3xl border border-default bg-surface p-5"
          >
            <div>
<h2 className="text-sm font-semibold text-foreground">{filter.title}</h2>
<p className="mt-1 text-xs text-muted-foreground">{filter.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filter.options.map((option) => (
                <Button key={option} variant="secondary" size="sm" disabled>
                  {option}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
<h2 className="text-lg font-semibold text-foreground">最新作品快照</h2>
          <Button variant="ghost" size="sm" disabled>
            即将支持更多筛选
          </Button>
        </div>
        <AssetMasonry assets={assetResult.items} isAuthenticated={Boolean(user)} />
      </section>
    </div>
  );
}
