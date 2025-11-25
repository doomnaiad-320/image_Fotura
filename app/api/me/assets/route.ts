import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAsset, type AssetWithMeta } from "./helpers";

const createSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空"),
  prompt: z.string().trim().min(1, "Prompt 不能为空"),
  modelSlug: z.string().trim().min(1, "请选择模型"),
  modelName: z.string().trim().optional(),
  coverUrl: z.string().trim().url("示例图地址无效"),
  size: z.string().trim().optional(),
  mode: z.string().trim().optional(),
  isPublic: z.boolean().default(false),
  shareCost: z.number().int().min(0).max(5000).default(0),
  aspectRatio: z.number().positive().optional()
});

const VIEW_SCHEMA = z.enum(["mine", "favorites", "public"]).default("mine");

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const view = VIEW_SCHEMA.parse(request.nextUrl.searchParams.get("view"));

  if (view === "favorites") {
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        asset: {
          where: { isDeleted: false },
          include: {
            favorites: {
              where: { userId: user.id },
              select: { id: true }
            },
            _count: {
              select: { reuseRecords: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const items = favorites
      .map((fav) => fav.asset)
      .filter((asset): asset is AssetWithMeta => Boolean(asset))
      .map((asset) => serializeAsset(asset, user.id));

    return NextResponse.json({ items });
  }

  if (view === "public") {
    const assets = await prisma.asset.findMany({
      where: {
        isPublic: true,
        isDeleted: false
      },
      include: {
        favorites: {
          where: { userId: user.id },
          select: { id: true }
        },
        _count: {
          select: { reuseRecords: true }
        }
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" }
      ],
      take: 30
    });

    const items = assets.map((asset) => serializeAsset(asset, user.id));
    return NextResponse.json({ items });
  }

  const assets = await prisma.asset.findMany({
    where: { userId: user.id, isDeleted: false },
    include: {
      favorites: {
        where: { userId: user.id },
        select: { id: true }
      },
      _count: {
        select: { reuseRecords: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const items = assets.map((asset) => serializeAsset(asset, user.id));
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = createSchema.parse(body);

    const asset = await prisma.asset.create({
      data: {
        title: payload.title.trim(),
        type: "image",
        coverUrl: payload.coverUrl.trim(),
        aspectRatio: payload.aspectRatio ?? 1,
        modelTag: payload.modelSlug,
        prompt: payload.prompt,
        userId: user.id,
        model: payload.modelSlug,
        modelName: payload.modelName ?? payload.modelSlug,
        size: payload.size ?? "1024x1024",
        mode: payload.mode ?? "txt2img",
        isPublic: payload.isPublic,
        reusePoints: payload.isPublic ? payload.shareCost : 0,
        tags: JSON.stringify([])
      },
      include: {
        favorites: {
          where: { userId: user.id },
          select: { id: true }
        },
        _count: {
          select: { reuseRecords: true }
        }
      }
    });

    return NextResponse.json({ item: serializeAsset(asset, user.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
