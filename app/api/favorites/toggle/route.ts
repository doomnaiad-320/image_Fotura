import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateHotScore } from "@/lib/ranking";

const schema = z.object({
  assetId: z.string().cuid(),
  active: z.boolean()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = schema.parse(body);

    const asset = await prisma.asset.findUnique({ where: { id: payload.assetId } });
    if (!asset) {
      return NextResponse.json({ message: "作品不存在" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const favorite = await tx.favorite.findUnique({
        where: {
          userId_assetId: {
            userId: user.id,
            assetId: payload.assetId
          }
        }
      });

      if (payload.active && !favorite) {
        await tx.favorite.create({
          data: {
            userId: user.id,
            assetId: payload.assetId
          }
        });
        const likes = asset.likes + 1;
        const hotScore = calculateHotScore({
          likes,
          views: asset.views,
          createdAt: asset.createdAt
        });
        await tx.asset.update({
          where: { id: payload.assetId },
          data: { likes, hotScore }
        });
        return { favorited: true };
      }

      if (!payload.active && favorite) {
        await tx.favorite.delete({ where: { id: favorite.id } });
        const likes = Math.max(asset.likes - 1, 0);
        const hotScore = calculateHotScore({
          likes,
          views: asset.views,
          createdAt: asset.createdAt
        });
        await tx.asset.update({
          where: { id: payload.assetId },
          data: { likes, hotScore }
        });
        return { favorited: false };
      }

      return { favorited: Boolean(favorite) };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "收藏失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
