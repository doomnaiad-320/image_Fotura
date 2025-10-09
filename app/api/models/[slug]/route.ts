import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/ai/guards";
import { getModelBySlug, toggleModel, upsertModel } from "@/lib/ai/models";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  displayName: z.string().optional(),
  family: z.string().optional(),
  modalities: z.array(z.string()).optional(),
  supportsStream: z.boolean().optional(),
  pricing: z.record(z.any()).optional(),
  rateLimit: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  sort: z.number().optional(),
  enabled: z.boolean().optional()
});

export async function PUT(
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
    const body = await request.json();
    const payload = updateSchema.parse(body);

    const existing = await getModelBySlug(context.params.slug);
    if (!existing) {
      return NextResponse.json({ message: "模型不存在" }, { status: 404 });
    }

    const provider = await prisma.provider.findUnique({
      where: { id: existing.providerId }
    });

    if (!provider) {
      return NextResponse.json({ message: "关联 Provider 不存在" }, { status: 400 });
    }

    const model = await upsertModel({
      slug: context.params.slug,
      displayName: payload.displayName ?? existing.displayName,
      providerSlug: provider.slug,
      family: payload.family ?? existing.family,
      modalities: payload.modalities ?? ((existing.modalities as string[]) ?? []),
      supportsStream: payload.supportsStream ?? existing.supportsStream,
      pricing: payload.pricing ?? (existing.pricing as Record<string, unknown>),
      rateLimit: payload.rateLimit ?? (existing.rateLimit as Record<string, unknown>),
      tags: payload.tags ?? ((existing.tags as string[]) ?? []),
      sort: payload.sort ?? existing.sort,
      enabled: payload.enabled ?? existing.enabled
    });

    return NextResponse.json({ model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PATCH(
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
    const body = await request.json();
    const { enabled } = z.object({ enabled: z.boolean() }).parse(body);
    await toggleModel(context.params.slug, enabled);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
