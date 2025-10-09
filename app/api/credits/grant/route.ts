import { TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/ai/guards";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  userId: z.string().cuid().optional(),
  email: z.string().email().optional(),
  amount: z.number().gt(0),
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

    const updated = await prisma.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: user.id },
        data: {
          credits: {
            increment: payload.amount
          }
        }
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          delta: payload.amount,
          reason: payload.reason ?? "管理员发放",
          status: TransactionStatus.success,
          providerSlug: null,
          modelSlug: null,
          metadata: {
            grantedBy: admin.id
          }
        }
      });

      return nextUser;
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        credits: updated.credits
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "发放失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
