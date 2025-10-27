import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { mergePromptWithLLM, mergePromptSimple } from "@/lib/ai/prompt-merger";

export const runtime = "nodejs";

const bodySchema = z.object({
  basePrompt: z.string().min(1, "缺少示例提示词"),
  userPrompt: z.string().min(1, "请输入你的新提示词"),
  lang: z.enum(["zh", "en"]).optional()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = bodySchema.parse(body);

    let finalPrompt: string;
    try {
      finalPrompt = await mergePromptWithLLM(payload.basePrompt, payload.userPrompt);
    } catch (err) {
      // 回退到简单拼接
      finalPrompt = mergePromptSimple(payload.basePrompt, payload.userPrompt);
    }

    return NextResponse.json({ finalPrompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "融合失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
