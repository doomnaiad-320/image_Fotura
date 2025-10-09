import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import { listProviders, providerInputSchema, upsertProvider } from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/auth";

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
    const provider = await upsertProvider(payload);
    return NextResponse.json({ provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
