import { NextResponse } from "next/server";

import { ensureGalleryCategoryStructure, DISPLAY_ROOT_SLUGS } from "@/lib/category-presets";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureGalleryCategoryStructure(prisma);

    const roots = await prisma.category.findMany({
      where: { enabled: true, parentId: null, slug: { in: DISPLAY_ROOT_SLUGS } },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      include: {
        children: {
          where: { enabled: true },
          orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    const orderMap = new Map(DISPLAY_ROOT_SLUGS.map((slug, index) => [slug, index]));
    roots.sort((a, b) => (orderMap.get(a.slug) ?? 99) - (orderMap.get(b.slug) ?? 99));

    const items = roots.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      children: r.children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug
      }))
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[Categories] GET", e);
    return NextResponse.json({ error: e.message || "获取失败" }, { status: 500 });
  }
}
