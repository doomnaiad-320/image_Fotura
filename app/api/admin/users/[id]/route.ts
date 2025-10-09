import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/ai/guards";
import { adjustCreditsByAdmin } from "@/lib/credits";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

const schema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  creditsDelta: z
    .number()
    .int()
    .optional(),
  reason: z.string().optional()
});

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const admin = await getCurrentUser();
  if (!admin) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }
  try {
    ensureAdmin(admin.role);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 403 });
  }

  const userId = context.params.id;

  try {
    const body = await request.json();
    const payload = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ message: "用户不存在" }, { status: 404 });
    }

    const headers = request.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const userAgent = headers.get("user-agent") ?? null;

    if (payload.role && payload.role !== user.role) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: payload.role }
      });

      await recordAuditLog({
        action: "update_user",
        description: `调整用户角色 ${user.email} -> ${payload.role}`,
        userId: admin.id,
        ip,
        userAgent,
        metadata: {
          targetUser: userId,
          oldRole: user.role,
          newRole: payload.role
        }
      });
    }

    if (payload.creditsDelta && payload.creditsDelta !== 0) {
      await adjustCreditsByAdmin({
        adminId: admin.id,
        userId,
        amount: payload.creditsDelta,
        reason: payload.reason ?? "后台调整"
      });

      await recordAuditLog({
        action: "grant_credits",
        description: `调整用户积分 ${user.email}`,
        userId: admin.id,
        ip,
        userAgent,
        metadata: {
          targetUser: userId,
          amount: payload.creditsDelta,
          reason: payload.reason ?? "后台调整"
        }
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      user: updated
        ? {
            ...updated,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString()
          }
        : null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
