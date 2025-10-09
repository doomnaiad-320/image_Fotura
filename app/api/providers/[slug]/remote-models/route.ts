import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import { pullModelsFromProvider } from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: { slug: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }
  try {
    ensureAdmin(user.role);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 403 });
  }

  try {
    const models = await pullModelsFromProvider(context.params.slug);
    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取远程模型失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
