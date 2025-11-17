import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAssets } from "@/lib/assets";
import { getCurrentUser } from "@/lib/auth";
import { assetQuerySchema } from "@/lib/validators/assets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = assetQuerySchema.parse({
      type: searchParams.get("type") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined
    });

    // 获取当前用户用于收藏状态，但任何错误都不应影响公共作品列表
    let userId: string | null = null;
    try {
      const user = await getCurrentUser();
      userId = user?.id ?? null;
    } catch (err) {
      console.error("[Assets] getCurrentUser", err);
    }

    const assets = await getAssets({
      type: parsed.type,
      sort: parsed.sort,
      cursor: parsed.cursor,
      categoryId: parsed.categoryId,
      limit: parsed.limit ?? 12,
      userId
    });

    return NextResponse.json(assets);
  } catch (e: any) {
    console.error("[Assets] GET", e);
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues?.[0]?.message || "参数错误" }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "获取失败" }, { status: 500 });
  }
}
