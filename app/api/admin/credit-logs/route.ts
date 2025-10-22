import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/credit-logs
 * 获取所有用户的积分交易记录
 */
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
  const userId = searchParams.get("userId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "50", 10), 100);

  const where = {
    ...(userId ? { userId } : {}),
    ...(status ? { status } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        provider: {
          select: {
            name: true,
            slug: true,
          },
        },
        model: {
          select: {
            displayName: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.creditTransaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      user: t.user,
      delta: t.delta,
      reason: t.reason,
      status: t.status,
      provider: t.provider,
      model: t.model,
      providerSlug: t.providerSlug,
      modelSlug: t.modelSlug,
      requestId: t.requestId,
      refWorkId: t.refWorkId,
      refUserId: t.refUserId,
      metadata: t.metadata,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
