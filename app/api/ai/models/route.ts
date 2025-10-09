import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

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
    modalities: Array.isArray(model.modalities) ? model.modalities : [],
    tags: Array.isArray(model.tags) ? model.tags : []
  }));

  return NextResponse.json({ models: payload });
}
