import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ensureAdmin } from "@/lib/ai/guards";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });
    ensureAdmin(user.role);

    const body = await req.json();
    const data: any = {};

    if (typeof body.title === "string" && body.title.trim()) {
      data.title = body.title.trim();
    }
    if (typeof body.reusePoints === "number" && body.reusePoints >= 0) {
      data.reusePoints = Math.floor(body.reusePoints);
    }
    if (typeof body.isPublic === "boolean") {
      data.isPublic = body.isPublic;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "无有效更新字段" }, { status: 400 });
    }

    const updated = await prisma.asset.update({
      where: { id: params.id },
      data,
      select: { id: true }
    });

    // 审计
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ADMIN_UPDATE_ASSET",
        description: `update asset ${params.id}`,
        metadata: JSON.stringify({ fields: Object.keys(data) })
      }
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (e: any) {
    console.error("[AdminAssets] PUT", e);
    return NextResponse.json({ error: e.message || "更新失败" }, { status: 500 });
  }
}