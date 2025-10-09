import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import {
  getProviderBySlug,
  listProviders,
  providerInputSchema,
  upsertProvider
} from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }
  try {
    ensureAdmin(user.role);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 403 });
  }

  const providers = await listProviders();
  return NextResponse.json({ providers });
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const payload = providerInputSchema.parse(body);
    const existing = await getProviderBySlug(payload.slug);
    const provider = await upsertProvider(payload);

    const headers = request.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const userAgent = headers.get("user-agent") ?? null;

    await recordAuditLog({
      action: existing ? "update_provider" : "create_provider",
      description: existing
        ? `更新 Provider ${provider.slug}`
        : `新增 Provider ${provider.slug}`,
      userId: user.id,
      ip,
      userAgent,
      metadata: {
        slug: provider.slug,
        name: provider.name,
        baseURL: provider.baseURL,
        enabled: provider.enabled
      }
    });

    return NextResponse.json({
      provider: {
        slug: provider.slug,
        name: provider.name,
        baseURL: provider.baseURL,
        enabled: provider.enabled
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
