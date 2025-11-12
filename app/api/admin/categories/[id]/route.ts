import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ensureAdmin } from "@/lib/ai/guards";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });
    ensureAdmin(user.role);

    const body = await req.json();
    const data: any = {};

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.slug === "string" && body.slug.trim()) {
      if (!/^[a-z0-9-]{2,40}$/.test(body.slug)) return NextResponse.json({ error: "slug格式不合法" }, { status: 400 });
      data.slug = body.slug.trim();
    }
    if (typeof body.enabled === "boolean") data.enabled = body.enabled;
    if (typeof body.sort === "number") data.sort = Math.floor(body.sort);

    if (body.parentId !== undefined) {
      const parentId = body.parentId ? String(body.parentId) : null;
      if (parentId) {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        if (!parent) return NextResponse.json({ error: "父级不存在" }, { status: 400 });
        if (parent.parentId) return NextResponse.json({ error: "仅支持两级分类" }, { status: 400 });
        if (parent.id === params.id) return NextResponse.json({ error: "不能将自身设为父级" }, { status: 400 });
      }
      data.parentId = parentId;
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ error: "无有效更新字段" }, { status: 400 });

    await prisma.category.update({ where: { id: params.id }, data });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "ADMIN_UPDATE_CATEGORY", description: `update category ${params.id}`, metadata: JSON.stringify({ fields: Object.keys(data) }) }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[AdminCategories] PATCH", e);
    return NextResponse.json({ error: e.message || "更新失败" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });
    ensureAdmin(user.role);

    const hasChildren = await prisma.category.count({ where: { parentId: params.id } });
    if (hasChildren > 0) return NextResponse.json({ error: "请先删除子分类" }, { status: 400 });

    const assetCount = await prisma.asset.count({ where: { categoryId: params.id } });
    if (assetCount > 0) return NextResponse.json({ error: "分类下有作品，请先迁移或清空" }, { status: 400 });

    await prisma.category.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "ADMIN_DELETE_CATEGORY", description: `delete category ${params.id}` }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[AdminCategories] DELETE", e);
    return NextResponse.json({ error: e.message || "删除失败" }, { status: 500 });
  }
}