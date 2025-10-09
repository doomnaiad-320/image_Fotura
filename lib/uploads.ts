export type AcceptedFile = {
  filename: string;
  mimeType: string;
  data: Buffer;
  size: number;
};

const MAX_FILE_SIZE_MB = 8;
const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"];

export async function fileToBuffer(file: File): Promise<AcceptedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const data = Buffer.from(arrayBuffer);

  if (data.length > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`文件过大，限制 ${MAX_FILE_SIZE_MB} MB`);
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_IMAGE_MIME.includes(mimeType)) {
    throw new Error("仅支持 PNG/JPEG/WebP 图片");
  }

  return {
    filename: file.name,
    mimeType,
    data,
    size: data.length
  };
}
