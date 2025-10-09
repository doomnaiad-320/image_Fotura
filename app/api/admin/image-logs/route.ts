import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }
  try {
    ensureAdmin(user.role);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take") ?? "100"), 200);

  const usages = await prisma.aiUsage.findMany({
    where: {
      kind: "image.generate",
      status: {
        in: ["success", "failed"]
      }
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      model: {
        select: {
          id: true,
          slug: true,
          displayName: true
        }
      }
    }
  });

  return NextResponse.json({
    logs: usages.map((usage) => ({
      id: usage.id,
      requestId: usage.requestId,
      status: usage.status,
      cost: usage.cost ?? null,
      createdAt: usage.createdAt.toISOString(),
      providerSlug: usage.providerSlug,
      modelSlug: usage.modelSlug,
      model: usage.model
        ? {
            id: usage.model.id,
            slug: usage.model.slug,
            displayName: usage.model.displayName
          }
        : null,
      user: usage.user
        ? {
            id: usage.user.id,
            email: usage.user.email,
            name: usage.user.name
          }
        : null
    }))
  });
}
