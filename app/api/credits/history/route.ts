import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/credits/history
 * 获取当前用户的消费历史记录
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 获取分页参数
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // 查询用户的消费记录
    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: skip,
        select: {
          id: true,
          type: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          reason: true,
          status: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.creditTransaction.count({
        where: {
          userId: user.id,
        },
      }),
    ]);

    // 格式化交易记录
    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      reason: t.reason,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      metadata: t.metadata || {},
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch credit history:", error);
    return NextResponse.json(
      { error: "获取消费历史失败" },
      { status: 500 }
    );
  }
}
