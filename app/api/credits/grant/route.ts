import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/ai/guards";
import { adjustCreditsByAdmin } from "@/lib/credits";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

const schema = z.object({
  userId: z.string().cuid().optional(),
  email: z.string().email().optional(),
  amount: z
    .number()
    .int()
    .refine((val) => val !== 0, "调整额度必须非零"),
  reason: z.string().optional()
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }
  try {
    ensureAdmin(admin.role);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 403 });
  }

  try {
    const body = await request.json();
    const payload = schema.parse(body);

    if (!payload.userId && !payload.email) {
      throw new Error("请提供 userId 或 email");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          payload.userId ? { id: payload.userId } : undefined,
          payload.email ? { email: payload.email } : undefined
        ].filter(Boolean) as any
      }
    });

    if (!user) {
      return NextResponse.json({ message: "用户不存在" }, { status: 404 });
    }

    const transaction = await adjustCreditsByAdmin({
      adminId: admin.id,
      userId: user.id,
      amount: payload.amount,
      reason: payload.reason ?? "管理员调整"
    });

    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, credits: true }
    });

    const headers = request.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const userAgent = headers.get("user-agent") ?? null;

    await recordAuditLog({
      action: "grant_credits",
      description: `管理员调整积分 ${user.email}`,
      userId: admin.id,
      ip,
      userAgent,
      metadata: {
        targetUser: user.id,
        amount: payload.amount,
        reason: payload.reason ?? "管理员调整",
        transactionId: transaction.id
      }
    });

    return NextResponse.json({
      user: updated
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "发放失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
