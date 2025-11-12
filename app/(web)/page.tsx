import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { AssetFeed } from "@/components/asset/asset-feed";
import { TypewriterHero } from "@/components/home/typewriter-hero";
import { getAssets } from "@/lib/assets";
import { getCurrentUser } from "@/lib/auth";
import { assetQuerySchema } from "@/lib/validators/assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIGC Studio · AI 驱动的创意未来",
  description: "多模态 AIGC 创作平台，汇聚顶尖 AI 模型，释放无限创意可能"
};

export default async function HomePage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionUser = await getCurrentUser();
  
  // 已登录用户自动跳转到创意工作室
  if (sessionUser) {
    redirect("/studio");
  }

  const parsed = assetQuerySchema.parse({
    type: typeof searchParams?.type === "string" ? searchParams.type : undefined,
    sort: typeof searchParams?.sort === "string" ? searchParams.sort : undefined,
    cursor: typeof searchParams?.cursor === "string" ? searchParams.cursor : undefined
  });

  const assetResult = await getAssets({
    type: parsed.type,
    sort: parsed.sort,
    cursor: parsed.cursor,
    limit: 8, // 减少首页展示数量
    userId: null
  });

  return (
    <>
      {/* Hero Section */}
      <TypewriterHero />

      {/* 灵感瀑布区域 */}
      <section id="explore" className="py-16 md:py-20">
        <div className="space-y-8">
          <div className="space-y-3 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              社区灵感
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
              探索社区创作者的精彩作品，发现无限创意灵感
            </p>
          </div>

          {/* 瀑布流 */}
          <AssetFeed
            initialItems={assetResult.items}
            initialCursor={assetResult.nextCursor}
            initialState={{ type: parsed.type, sort: parsed.sort }}
            isAuthenticated={false}
            userCredits={0}
          />

          {/* 查看更多/登录引导 */}
          <div className="flex flex-col items-center gap-4 pt-8">
            <p className="text-sm text-muted-foreground">
              登录后解锁完整社区内容和创作功能
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                登录查看更多
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-background px-8 py-3 text-base font-semibold text-foreground transition-all hover:border-purple-500/50"
              >
                立即注册
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
