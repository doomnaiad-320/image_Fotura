import { NextResponse } from "next/server";

import { editImage } from "@/lib/ai/images";
import { mergePromptWithLLM, mergePromptSimple } from "@/lib/ai/prompt-merger";
import { getCurrentUser } from "@/lib/auth";
import { fileToBuffer } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const modelSlug = form.get("model")?.toString();
    const prompt = form.get("prompt")?.toString();
    const originalPrompt = form.get("originalPrompt")?.toString(); // 原始提示词
    const size = form.get("size")?.toString();
    const nRaw = form.get("n")?.toString();
    const n = Math.min(Math.max(Number(nRaw ?? "1"), 1), 4);

    if (!modelSlug) {
      throw new Error("缺少模型参数");
    }
    if (!prompt) {
      throw new Error("请输入提示词");
    }

    // 如果提供了原始 Prompt，尝试智能合并
    let finalPrompt = prompt;
    if (originalPrompt && originalPrompt !== prompt) {
      try {
        console.log('[ImageEdit] 尝试智能合并 Prompt...');
        console.log('[ImageEdit] 原始:', originalPrompt);
        console.log('[ImageEdit] 修改:', prompt);
        
        finalPrompt = await mergePromptWithLLM(originalPrompt, prompt);
        
        console.log('[ImageEdit] 合并结果:', finalPrompt);
      } catch (error) {
        console.warn('[ImageEdit] Prompt 合并失败，使用简单拼接:', error);
        // 回退到简单拼接
        finalPrompt = mergePromptSimple(originalPrompt, prompt);
      }
    }

    const imageEntry = form.get("image");
    if (!(imageEntry instanceof File)) {
      throw new Error("请上传原始图片");
    }

    const image = await fileToBuffer(imageEntry);
    const maskEntry = form.get("mask");
    const maskFile = maskEntry instanceof File && maskEntry.size > 0 ? await fileToBuffer(maskEntry) : null;

    const imageBlob = new File([image.data], image.filename, { type: image.mimeType });
    const maskBlob = maskFile
      ? new File([maskFile.data], maskFile.filename, { type: maskFile.mimeType })
      : undefined;

    const result = await editImage({
      userId: user.id,
      modelSlug,
      prompt: finalPrompt, // 使用合并后的 Prompt
      size,
      quantity: n,
      image: imageBlob,
      mask: maskBlob
    });

    // 返回结果时带上生成的完整 Prompt
    return NextResponse.json({
      ...result,
      generatedPrompt: finalPrompt, // LLM 生成的完整 Prompt
      originalInput: prompt // 用户原始输入
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "编辑失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
