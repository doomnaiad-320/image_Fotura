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

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      createdAt: log.createdAt.toISOString(),
      ip: log.ip,
      userAgent: log.userAgent,
      user: log.user
        ? {
            id: log.user.id,
            email: log.user.email,
            name: log.user.name
          }
        : null,
      metadata: (() => {
        if (!log.metadata) return {};
        try {
          return typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
        } catch {
          return {};
        }
      })()
    }))
  });
}
