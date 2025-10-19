import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const publishSchema = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  imageUrl: z.string().url().or(z.string().startsWith("data:")),
  fullPrompt: z.string().min(1),
  editChain: z.any().optional(),
  model: z.string().min(1),
  modelName: z.string().min(1).optional(),
  size: z.string().min(1), // e.g. 1024x1024
  mode: z.enum(["txt2img", "img2img"]),
  tags: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(true),
  title: z.string().optional()
});

function parseAspectRatio(size: string): number {
  // size like "1024x768"
  const m = size.match(/^(\d+)x(\d+)$/i);
  if (!m) return 1.0;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) return 1.0;
  return Number((w / h).toFixed(4));
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const json = await request.json();
    const data = publishSchema.parse(json);

    if (typeof data.imageUrl === "string" && data.imageUrl.startsWith("blob:")) {
      return NextResponse.json(
        { error: "请先上传图片到云存储后再发布（不支持 blob:// 本地地址）" },
        { status: 400 }
      );
    }

    const aspectRatio = parseAspectRatio(data.size);
    const modelTag = data.modelName || data.model;

    const title = data.title?.trim() || "AI 作品";
    const tags = Array.isArray(data.tags)
      ? data.tags.map((t) => `${t}`.trim()).filter(Boolean)
      : [];

    const created = await prisma.asset.create({
      data: {
        title,
        type: "image",
        coverUrl: data.imageUrl,
        aspectRatio,
        modelTag,
        tags: JSON.stringify(tags),
        // AI 生成相关信息
        prompt: data.fullPrompt,
        userId: user.id,
        messageId: data.messageId,
        conversationId: data.conversationId,
        model: data.model,
        modelName: data.modelName || data.model,
        size: data.size,
        mode: data.mode,
        editChain: data.editChain ? JSON.stringify(data.editChain) : "{}",
        isPublic: data.isPublic
      }
    });

    return NextResponse.json({ success: true, assetId: created.id });
  } catch (err) {
    console.error("[assets.publish] error", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues?.[0]?.message || "参数错误" }, { status: 400 });
    }
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}
