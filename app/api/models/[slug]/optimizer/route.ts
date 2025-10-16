import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/ai/guards";
import { setPromptOptimizerModel } from "@/lib/ai/models";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(
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
    await setPromptOptimizerModel(context.params.slug);

    const headers = request.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const userAgent = headers.get("user-agent") ?? null;

    await recordAuditLog({
      action: "set_prompt_optimizer",
      description: `设置 Prompt 优化器模型: ${context.params.slug}`,
      userId: user.id,
      ip,
      userAgent,
      metadata: {
        modelSlug: context.params.slug
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "设置失败";
    return NextResponse.json({ message }, { status: 400 });
  }
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
    const { prisma } = await import("@/lib/prisma");
    
    await prisma.aiModel.update({
      where: { slug: context.params.slug },
      data: { isPromptOptimizer: false }
    });

    const headers = request.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const userAgent = headers.get("user-agent") ?? null;

    await recordAuditLog({
      action: "unset_prompt_optimizer",
      description: `取消 Prompt 优化器标记: ${context.params.slug}`,
      userId: user.id,
      ip,
      userAgent,
      metadata: {
        modelSlug: context.params.slug
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取消失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
