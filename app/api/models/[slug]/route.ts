import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/ai/guards";
import { deleteModel, getModelBySlug, toggleModel, upsertModel } from "@/lib/ai/models";
import { recordAuditLog } from "@/lib/audit";
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

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

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

    const existingPricing = parseJsonObject(existing.pricing);
    const nextPricing = parseJsonObject(payload.pricing) ?? existingPricing ?? {};

    const existingModalities = parseJsonArray(existing.modalities);
    const existingRateLimit = parseJsonObject(existing.rateLimit) ?? {};
    const existingTags = parseJsonArray(existing.tags);

    const model = await upsertModel({
      slug: context.params.slug,
      displayName: payload.displayName ?? existing.displayName,
      providerSlug: provider.slug,
      family: payload.family ?? existing.family,
      modalities: payload.modalities ?? existingModalities,
      supportsStream: payload.supportsStream ?? existing.supportsStream,
      pricing: nextPricing,
      rateLimit: payload.rateLimit ?? existingRateLimit,
      tags: payload.tags ?? existingTags,
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
    const existing = await getModelBySlug(context.params.slug);
    if (!existing) {
      return NextResponse.json({ message: "模型不存在" }, { status: 404 });
    }

    const provider = existing.providerId
      ? await prisma.provider.findUnique({
          where: { id: existing.providerId },
          select: { id: true, slug: true, name: true }
        })
      : null;

    await deleteModel(context.params.slug);

    const headers = request.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const userAgent = headers.get("user-agent") ?? null;

    await recordAuditLog({
      action: "delete_model",
      description: `删除模型 ${context.params.slug}`,
      userId: user.id,
      ip,
      userAgent,
      metadata: {
        slug: context.params.slug,
        providerId: provider?.id,
        providerSlug: provider?.slug,
        providerName: provider?.name
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
