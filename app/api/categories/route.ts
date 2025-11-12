import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const roots = await prisma.category.findMany({
      where: { enabled: true, parentId: null },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      include: { children: { where: { enabled: true }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] } }
    });

    const items = roots.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      children: r.children.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[Categories] GET", e);
    return NextResponse.json({ error: e.message || "获取失败" }, { status: 500 });
  }
}