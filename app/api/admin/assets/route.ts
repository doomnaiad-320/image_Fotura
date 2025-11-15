import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

    const items = records.map(mapAdminAsset);

    return NextResponse.json({ items, nextCursor });
  } catch (e: any) {
    console.error("[AdminAssets] GET", e);
    return NextResponse.json({ error: e.message || "获取失败" }, { status: 500 });
  }
}

const createAssetSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  categoryId: z.string().min(1, "分类不能为空"),
  prompt: z.string().optional().nullable(),
  coverUrl: z.string().url("图片链接无效"),
  isPublic: z.boolean().optional().default(true),
  reusePoints: z.number().int().min(0).max(10000).optional().default(50),
  modelSlug: z.string().min(1).optional()
});

function mapAdminAsset(a: any) {
  return {
    id: a.id,
    title: a.title,
    type: a.type as any,
    coverUrl: a.coverUrl,
    videoUrl: a.videoUrl,
    aspectRatio: a.aspectRatio,
    durationSec: a.durationSec,
    modelTag: a.modelTag,
    tags: (() => {
      try {
        return Array.isArray(a.tags) ? (a.tags as string[]) : JSON.parse(a.tags as any);
      } catch {
        return [] as string[];
      }
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
    // prisma 类型暂未生成 categoryId 字段，使用 any 访问
    categoryId: (a as any).categoryId,
    author: a.user,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });
    ensureAdmin(user.role);

    const json = await req.json();
    const parsed = createAssetSchema.parse(json);

    // 校验分类（必须启用）
    const category = await prisma.category.findFirst({ where: { id: parsed.categoryId, enabled: true } });
    if (!category) {
      return NextResponse.json({ error: "分类不存在或已禁用" }, { status: 400 });
    }

    // 解析模型（可选）
    let modelSlug: string | null = null;
    let modelName: string | null = null;
    if (parsed.modelSlug) {
      const model = await prisma.aiModel.findFirst({
        where: { slug: parsed.modelSlug, enabled: true, provider: { enabled: true } },
        select: { slug: true, displayName: true }
      });
      if (!model) {
        return NextResponse.json({ error: "模型不存在或已禁用" }, { status: 400 });
      }
      modelSlug = model.slug;
      modelName = model.displayName;
    }

    const created = await prisma.asset.create({
      data: {
        title: parsed.title.trim(),
        type: "image",
        coverUrl: parsed.coverUrl,
        aspectRatio: 1.0,
        modelTag: modelName || "示例", // 显示模型名，否则回退为示例
        tags: JSON.stringify([]),
        prompt: parsed.prompt?.trim() || null,
        model: modelSlug,
        modelName,
        // 将管理员创建的示例也视为“真实作品”，便于在灵感画廊中展示
        userId: user.id,
        isPublic: parsed.isPublic ?? true,
        reusePoints: parsed.reusePoints ?? 50,
        categoryId: category.id,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // 审计日志
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ADMIN_CREATE_ASSET",
        description: `create asset ${created.id}`,
        metadata: JSON.stringify({ categoryId: category.id }),
      },
    });

    const item = mapAdminAsset(created as any);
    return NextResponse.json({ item });
  } catch (e: any) {
    console.error("[AdminAssets] POST", e);
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues?.[0]?.message || "参数错误" }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "创建失败" }, { status: 500 });
  }
}
