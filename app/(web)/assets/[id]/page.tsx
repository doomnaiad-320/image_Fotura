import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReuseButton } from "@/components/asset/reuse-button";
import { FavoriteButton } from "@/components/asset/favorite-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const asset = await prisma.asset.findUnique({
    where: { id: params.id }
  });

  if (!asset) {
    return {
      title: "作品未找到"
    };
  }

  return {
    title: `${asset.title} - AIGC Studio`,
    description: asset.prompt || asset.title
  };
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const asset = await prisma.asset.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      favorites: {
        select: {
          userId: true
        }
      },
      reuseRecords: {
        select: {
          reuserId: true
        }
      }
    }
  });

  if (!asset) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const isFavorited = currentUser
    ? asset.favorites.some((f) => f.userId === currentUser.id)
    : false;
  
  // 检查当前用户是否已复用
  const hasReused = currentUser
    ? asset.reuseRecords.some((r) => r.reuserId === currentUser.id)
    : false;
  
  // 是否作者本人
  const isAuthor = currentUser?.id === asset.userId;

  // 若作品被软删除，仅作者与已复用用户可访问
  // @ts-expect-error prisma types generated after migration
  if ((asset as any).isDeleted && !isAuthor && !hasReused) {
    notFound();
  }
  
  // Prompt 可见性：作者、免费作品、或已复用
  const promptVisible = isAuthor || asset.reusePoints === 0 || hasReused;

  let tags: string[] = [];
  if (Array.isArray(asset.tags)) {
    tags = asset.tags as string[];
  } else if (typeof asset.tags === "string") {
    try {
      const parsed = JSON.parse(asset.tags || "[]");
      if (Array.isArray(parsed)) {
        tags = parsed as string[];
      }
    } catch {
      tags = [];
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* 返回按钮 */}
      <div>
        <Link href="/">
          <Button variant="ghost">
            ← 返回首页
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 左侧：图片 */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {asset.type === "video" ? (
            <video
              className="w-full h-auto"
              style={{ aspectRatio: asset.aspectRatio }}
              poster={asset.coverUrl}
              src={asset.videoUrl ?? undefined}
              controls
            />
          ) : (
            <Image
              src={asset.coverUrl}
              alt={asset.title}
              width={1200}
              height={1200 / asset.aspectRatio}
              className="w-full h-auto object-cover"
              unoptimized
            />
          )}
        </div>

        {/* 右侧：详细信息 */}
        <div className="space-y-6">
          {/* 标题和徽章 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="border-default bg-surface-2 text-foreground">
                {asset.type === "video" ? "视频" : "图片"}
              </Badge>
              {/* 状态徽章：公开/私密/已删除 */}
              {/* @ts-expect-error prisma types generated after migration */}
              {(asset as any).isDeleted ? (
                <Badge variant="destructive">已删除</Badge>
              ) : asset.isPublic ? (
                <Badge variant="outline">公开</Badge>
              ) : (
                <Badge variant="secondary">私密</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground">{asset.title}</h1>
          </div>

          {/* Prompt */}
          {asset.prompt && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">提示词 (Prompt)</h3>
              {promptVisible ? (
                <p className="rounded-xl border border-border bg-muted p-4 text-sm leading-relaxed">
                  {asset.prompt}
                </p>
              ) : (
                <div className="rounded-xl border border-border bg-muted p-4 relative">
                  <p className="text-sm leading-relaxed blur-sm select-none">
                    {asset.prompt}
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-[2px] rounded-xl">
                    <div className="text-center space-y-2">
                      <svg className="w-8 h-8 mx-auto text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-sm font-medium text-foreground">
                        需要复用后查看
                      </p>
                      <p className="text-xs text-muted-foreground">
                        复用该作品需 {asset.reusePoints} 积分
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 模型信息 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">生成信息</h3>
            <div className="rounded-xl border border-border bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">模型</span>
                <span className="font-medium">{asset.modelName || asset.model || asset.modelTag}</span>
              </div>
              {asset.size && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">尺寸</span>
                  <span className="font-medium">{asset.size}</span>
                </div>
              )}
              {asset.mode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">模式</span>
                  <span className="font-medium">
                    {asset.mode === "txt2img" ? "文生图" : "图生图"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">宽高比</span>
                <span className="font-medium">{asset.aspectRatio.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 标签 */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">标签</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs uppercase tracking-[0.2em]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 统计信息 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">统计</h3>
            <div className="rounded-xl border border-border bg-muted p-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-2xl font-bold text-foreground">{asset.views}</p>
                <p className="text-muted-foreground">浏览</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{asset.likes}</p>
                <p className="text-muted-foreground">点赞</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{asset.hotScore.toFixed(1)}</p>
                <p className="text-muted-foreground">热度</p>
              </div>
            </div>
          </div>

          {/* 创作者 */}
          {asset.user && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">创作者</h3>
              <div className="rounded-xl border border-border bg-muted p-4 text-sm">
                <p className="font-medium">{asset.user.name || asset.user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  发布于 {new Date(asset.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            {/* 收藏按钮 */}
            <FavoriteButton
              assetId={asset.id}
              initialFavorited={isFavorited}
              isAuthenticated={Boolean(currentUser)}
            />
            {/* 复用按钮 - 仅非作者可见 */}
            {(!currentUser || currentUser.id !== asset.userId) && (
              <ReuseButton
                assetId={asset.id}
                assetTitle={asset.title}
                isAuthenticated={Boolean(currentUser)}
                userCredits={currentUser?.credits || 0}
                reusePoints={asset.reusePoints ?? 50}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
