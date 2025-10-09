import { NextResponse } from "next/server";

import { editImage } from "@/lib/ai/images";
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
    const size = form.get("size")?.toString();
    const nRaw = form.get("n")?.toString();
    const n = Math.min(Math.max(Number(nRaw ?? "1"), 1), 4);

    if (!modelSlug) {
      throw new Error("缺少模型参数");
    }
    if (!prompt) {
      throw new Error("请输入提示词");
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
      prompt,
      size,
      quantity: n,
      image: imageBlob,
      mask: maskBlob
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "编辑失败";
    return NextResponse.json({ message }, { status: 400 });
  }
}
