import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import { deleteProvider, getProviderBySlug } from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

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
    const existing = await getProviderBySlug(context.params.slug);
    await deleteProvider(context.params.slug);
    if (existing) {
      const headers = request.headers;
      const ip =
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headers.get("x-real-ip") ??
        null;
      const userAgent = headers.get("user-agent") ?? null;
      await recordAuditLog({
        action: "delete_provider",
        description: `删除 Provider ${existing.slug}`,
        userId: user.id,
        ip,
        userAgent,
        metadata: {
          slug: existing.slug,
          name: existing.name
        }
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
