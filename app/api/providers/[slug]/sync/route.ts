import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import { importRemoteModels } from "@/lib/ai/models";
import { pullModelsFromProvider } from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  _: Request,
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
    const remotes = await pullModelsFromProvider(context.params.slug);
    await importRemoteModels(context.params.slug, remotes);
    return NextResponse.json({ imported: remotes.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
