import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAsset } from "../helpers";

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  prompt: z.string().trim().optional(),
  modelSlug: z.string().trim().optional(),
  modelName: z.string().trim().optional(),
  coverUrl: z.string().trim().url().optional(),
  size: z.string().trim().optional(),
  mode: z.string().trim().optional(),
  isPublic: z.boolean().optional(),
  shareCost: z.number().int().min(0).max(5000).optional(),
  aspectRatio: z.number().positive().optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = updateSchema.parse(body);

    const asset = await prisma.asset.findFirst({
      where: { id: params.id, userId: user.id, isDeleted: false },
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

    if (!asset) {
      return NextResponse.json({ message: "素材不存在" }, { status: 404 });
    }

    const updated = await prisma.asset.update({
      where: { id: params.id },
      data: {
        title: payload.title ?? asset.title,
        prompt: payload.prompt ?? asset.prompt,
        coverUrl: payload.coverUrl ?? asset.coverUrl,
        model: payload.modelSlug ?? asset.model,
        modelTag: payload.modelSlug ?? asset.modelTag,
        modelName: payload.modelName ?? asset.modelName,
        size: payload.size ?? asset.size,
        mode: payload.mode ?? asset.mode,
        aspectRatio: payload.aspectRatio ?? asset.aspectRatio,
        isPublic: payload.isPublic ?? asset.isPublic,
        reusePoints:
          payload.isPublic ?? asset.isPublic
            ? payload.shareCost ?? asset.reusePoints
            : 0
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

    return NextResponse.json({ item: serializeAsset(updated, user.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const asset = await prisma.asset.findFirst({
    where: { id: params.id, userId: user.id, isDeleted: false }
  });

  if (!asset) {
    return NextResponse.json({ message: "素材不存在" }, { status: 404 });
  }

  await prisma.asset.update({
    where: { id: params.id },
    data: {
      isDeleted: true,
      isPublic: false
    }
  });

  return NextResponse.json({ success: true });
}
