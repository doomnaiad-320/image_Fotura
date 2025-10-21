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

    const [pageItems, total, newerItems] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          delta: true,
          reason: true,
          status: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.creditTransaction.count({ where: { userId: user.id } }),
      skip > 0
        ? prisma.creditTransaction.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: skip,
            select: { delta: true },
          })
        : Promise.resolve([] as { delta: number }[]),
    ]);

    // 计算当前页起始余额（为本页第一条记录的“交易后余额”）
    const sumNewerDelta = newerItems.reduce((s, x) => s + x.delta, 0);
    let runningAfter = user.credits - sumNewerDelta;

    function mapReasonToZh(reason?: string | null) {
      if (!reason) return "-";
      const r = reason.toLowerCase();
      if (r === "image.edit.precharge") return "图片编辑预扣";
      if (r === "image.generate.precharge") return "图片生成预扣";
      if (r === "chat.precharge") return "对话预扣";
      return reason; // 其他保持原文（多数已是中文）
    }

    const formattedTransactions = pageItems.map((t) => {
      const uiType =
        t.status === "pending"
          ? "precharge"
          : t.status === "refunded"
          ? "refund"
          : t.delta < 0
          ? "debit"
          : "credit";

      const uiStatus =
        t.status === "pending"
          ? "pending"
          : t.status === "success" || t.status === "refunded"
          ? "completed"
          : "cancelled"; // 失败归为取消

      const balanceAfter = runningAfter;
      const balanceBefore = balanceAfter - t.delta; // delta 为负表示扣减
      runningAfter = balanceBefore; // 为下一条（更老）记录做准备

      let metadata: any = {};
      try {
        metadata = t.metadata ? JSON.parse(String(t.metadata)) : {};
      } catch {
        metadata = {};
      }

      return {
        id: t.id,
        type: uiType,
        amount: Math.abs(t.delta),
        balanceBefore,
        balanceAfter,
        reason: mapReasonToZh(t.reason),
        status: uiStatus,
        createdAt: t.createdAt.toISOString(),
        metadata,
      };
    });

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
