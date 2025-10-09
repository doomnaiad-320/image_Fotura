import { NextResponse } from "next/server";
import { z } from "zod";

import { generateImages } from "@/lib/ai/images";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  size: z.string().optional(),
  n: z.number().int().min(1).max(4).optional(),
  response_format: z.enum(["url", "b64_json"]).optional().default("url")
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = bodySchema.parse(body);
    const result = await generateImages({
      userId: user.id,
      modelSlug: payload.model,
      prompt: payload.prompt,
      size: payload.size,
      quantity: payload.n,
      responseFormat: payload.response_format
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
