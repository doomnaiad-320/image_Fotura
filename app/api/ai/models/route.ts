import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function parseStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizePricing(value: unknown) {
  if (!value) {
    return null;
  }
  let raw: any = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return raw;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerSlug = searchParams.get("provider");

  const models = await prisma.aiModel.findMany({
    where: {
      enabled: true,
      provider: providerSlug ? { slug: providerSlug, enabled: true } : { enabled: true }
    },
    orderBy: [{ sort: "asc" }, { displayName: "asc" }],
    select: {
      slug: true,
      displayName: true,
      family: true,
      modalities: true,
      supportsStream: true,
      pricing: true,
      rateLimit: true,
      tags: true,
      provider: {
        select: {
          slug: true,
          name: true
        }
      }
    }
  });

  const payload = models.map((model) => ({
    ...model,
    modalities: parseStringArray(model.modalities),
    tags: parseStringArray(model.tags),
    pricing: normalizePricing(model.pricing)
  }));

  return NextResponse.json({ models: payload });
}
