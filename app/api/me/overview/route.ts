import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

function mapTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw || '[]'); } catch { return []; }
  }
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const [published, reused, favorites] = await Promise.all([
      prisma.asset.findMany({
        where: { userId: user.id, isDeleted: false },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.reuseRecord.findMany({
        where: { reuserId: user.id },
        include: {
          sourceWork: {
            include: {
              favorites: { where: { userId: user.id }, select: { id: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.favorite.findMany({
        where: { userId: user.id, asset: { isDeleted: false } },
        include: { asset: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const publishedItems = published.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type as any,
      coverUrl: a.coverUrl,
      videoUrl: a.videoUrl,
      aspectRatio: a.aspectRatio,
      durationSec: a.durationSec,
      modelTag: a.modelTag,
      tags: mapTags(a.tags as any),
      views: a.views,
      likes: a.likes,
      hotScore: a.hotScore,
      createdAt: a.createdAt,
      isFavorited: false,
      prompt: a.prompt,
      userId: a.userId,
      model: a.model,
      modelName: a.modelName,
      size: a.size,
      mode: a.mode,
      reusePoints: a.reusePoints ?? 50,
    }));

    const reusedItems = reused
      .map((r) => r.sourceWork)
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a: any) => ({
        id: a.id,
        title: a.title,
        type: a.type as any,
        coverUrl: a.coverUrl,
        videoUrl: a.videoUrl,
        aspectRatio: a.aspectRatio,
        durationSec: a.durationSec,
        modelTag: a.modelTag,
        tags: mapTags(a.tags),
        views: a.views,
        likes: a.likes,
        hotScore: a.hotScore,
        createdAt: a.createdAt,
        isFavorited: Array.isArray(a.favorites) && a.favorites.length > 0,
        prompt: a.prompt,
        userId: a.userId,
        model: a.model,
        modelName: a.modelName,
        size: a.size,
        mode: a.mode,
        reusePoints: a.reusePoints ?? 50,
      }));

    const favoriteItems = favorites.map((f) => {
      const a = f.asset as any;
      return {
        id: a.id,
        title: a.title,
        type: a.type as any,
        coverUrl: a.coverUrl,
        videoUrl: a.videoUrl,
        aspectRatio: a.aspectRatio,
        durationSec: a.durationSec,
        modelTag: a.modelTag,
        tags: mapTags(a.tags),
        views: a.views,
        likes: a.likes,
        hotScore: a.hotScore,
        createdAt: a.createdAt,
        isFavorited: true,
        prompt: a.prompt,
        userId: a.userId,
        model: a.model,
        modelName: a.modelName,
        size: a.size,
        mode: a.mode,
        reusePoints: a.reusePoints ?? 50,
      };
    });

    return NextResponse.json({ published: publishedItems, reused: reusedItems, favorites: favoriteItems });
  } catch (error: any) {
    console.error('[MeOverview] GET error:', error);
    return NextResponse.json({ error: error.message || '获取失败' }, { status: 500 });
  }
}
