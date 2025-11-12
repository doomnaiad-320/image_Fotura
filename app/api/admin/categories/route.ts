import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ensureAdmin } from "@/lib/ai/guards";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });
    ensureAdmin(user.role);

    const cats = await prisma.category.findMany({
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      include: { children: { orderBy: [{ sort: "asc" }, { createdAt: "asc" }] } }
    });

    // 返回为树结构（仅两级）
    const roots = cats.filter((c) => !c.parentId);
    const items = roots.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      enabled: r.enabled,
      sort: r.sort,
      children: cats
        .filter((c) => c.parentId === r.id)
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug, enabled: c.enabled, sort: c.sort }))
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[AdminCategories] GET", e);
    return NextResponse.json({ error: e.message || "获取失败" }, { status: 500 });
  }
}

function slugify(input: string): string {
  // 基础 slugify：小写、非字母数字替换为 -，合并多余 -
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base.length >= 2 ? base : 'cat';
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 2;
  // 最多尝试 100 次避免死循环
  while (await prisma.category.findUnique({ where: { slug } })) {
    const suffix = `-${i}`;
    const maxLen = 40 - suffix.length;
    slug = `${base.slice(0, Math.max(2, maxLen))}${suffix}`;
    i += 1;
    if (i > 100) break;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });
    ensureAdmin(user.role);

    const body = await req.json();
    const name = String(body.name || "").trim();
    let slug = String(body.slug || "").trim();
    const parentId = body.parentId ? String(body.parentId) : null;
    const sort = Number.isFinite(body.sort) ? Math.floor(body.sort) : 100;

    if (!name) return NextResponse.json({ error: "名称必填" }, { status: 400 });

    // 只允许两级：如果传 parentId，则该 parent 必须是根节点
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) return NextResponse.json({ error: "父级不存在" }, { status: 400 });
      if (parent.parentId) return NextResponse.json({ error: "仅支持两级分类" }, { status: 400 });
    }

    // 自动生成 slug（若未提供或不合法）
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
      const base = slugify(name);
      slug = await ensureUniqueSlug(base);
    } else {
      // 如果提供了合法 slug，也要确保唯一
      slug = await ensureUniqueSlug(slug);
    }

    const created = await prisma.category.create({ data: { name, slug, parentId, sort } });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "ADMIN_CREATE_CATEGORY", description: `create category ${created.id}` }
    });

    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    console.error("[AdminCategories] POST", e);
    return NextResponse.json({ error: e.message || "创建失败" }, { status: 500 });
  }
}
