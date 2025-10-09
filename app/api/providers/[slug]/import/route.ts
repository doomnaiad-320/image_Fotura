import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/ai/guards";
import { importRemoteModels } from "@/lib/ai/models";
import { pullModelsFromProvider } from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

const schema = z.object({
  modelIds: z.array(z.string()).min(1)
});

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
    const body = await request.json();
    const payload = schema.parse(body);
    const remoteModels = await pullModelsFromProvider(context.params.slug);
    const selected = remoteModels.filter((model) => payload.modelIds.includes(model.id));
    if (selected.length === 0) {
      return NextResponse.json({ message: "未找到选定模型" }, { status: 400 });
    }

    await importRemoteModels(context.params.slug, selected);

    const headers = request.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null;
    const userAgent = headers.get("user-agent") ?? null;

    await recordAuditLog({
      action: "sync_models",
      description: `导入 Provider ${context.params.slug} 模型`,
      userId: user.id,
      ip,
      userAgent,
      metadata: {
        provider: context.params.slug,
        count: selected.length,
        modelIds: payload.modelIds
      }
    });

    return NextResponse.json({ imported: selected.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
