import { NextResponse } from "next/server";

import { getAssets } from "@/lib/assets";
import { getCurrentUser } from "@/lib/auth";
import { assetQuerySchema } from "@/lib/validators/assets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = assetQuerySchema.parse({
    type: searchParams.get("type") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined
  });

  const user = await getCurrentUser();
  const assets = await getAssets({
    type: parsed.type,
    sort: parsed.sort,
    cursor: parsed.cursor,
    limit: parsed.limit ?? 12,
    userId: user?.id ?? null
  });

  return NextResponse.json(assets);
}
