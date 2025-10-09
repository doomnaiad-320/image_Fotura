import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import { deleteProvider, getProviderBySlug } from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
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

  const provider = await getProviderBySlug(context.params.slug);
  if (!provider) {
    return NextResponse.json({ message: "Provider 不存在" }, { status: 404 });
  }
  return NextResponse.json({ provider });
}

export async function DELETE(
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
    await deleteProvider(context.params.slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
