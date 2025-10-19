/**
 * Cloudflare R2 存储服务
 * 使用 S3 兼容 API
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 验证环境变量
function validateR2Config() {
  const required = [
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`缺少 R2 配置: ${missing.join(', ')}`);
  }
}

// 创建 S3 客户端（R2 兼容）
function getR2Client() {
  validateR2Config();

  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * 上传文件到 R2
 * @param file 文件对象（Blob/File）
 * @param userId 用户 ID（用于路径隔离）
 * @returns 公开访问 URL
 */
export async function uploadToR2(file: Blob | File, userId: string): Promise<string> {
  const client = getR2Client();
  
  // 生成唯一文件名
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const ext = file.type.split('/')[1] || 'png';
  const key = `images/${userId}/${timestamp}-${randomStr}.${ext}`;

  // 上传到 R2
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type || 'image/png',
  });

  await client.send(command);

  // 返回公开 URL
  const publicUrl = process.env.R2_PUBLIC_URL!;
  return `${publicUrl}/${key}`;
}

/**
 * 从 blob URL 上传到 R2
 * @param blobUrl blob:// 本地 URL
 * @param userId 用户 ID
 * @returns 公开访问 URL
 */
export async function uploadBlobToR2(blobUrl: string, userId: string): Promise<string> {
  // 从 blob URL 获取文件
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  
  return uploadToR2(blob, userId);
}
