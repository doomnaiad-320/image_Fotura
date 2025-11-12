import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ensureAdmin } from "@/lib/ai/guards";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });
    ensureAdmin(user.role);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const cursor = searchParams.get("cursor");
    const q = searchParams.get("q")?.trim();

    const where: any = { isDeleted: false };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { modelTag: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const records = await prisma.asset.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: limit + 1,
      skip: cursor ? 1 : undefined,
      cursor: cursor ? { id: cursor } : undefined,
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const next = records.pop();
      nextCursor = next?.id ?? null;
    }

    const items = records.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type as any,
      coverUrl: a.coverUrl,
      videoUrl: a.videoUrl,
      aspectRatio: a.aspectRatio,
      durationSec: a.durationSec,
      modelTag: a.modelTag,
      tags: (() => {
        try { return JSON.parse(a.tags as any) as string[]; } catch { return []; }
      })(),
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
      isPublic: a.isPublic,
      categoryId: (a as any).categoryId,
      author: a.user,
    }));

    return NextResponse.json({ items, nextCursor });
  } catch (e: any) {
    console.error("[AdminAssets] GET", e);
    return NextResponse.json({ error: e.message || "获取失败" }, { status: 500 });
  }
}