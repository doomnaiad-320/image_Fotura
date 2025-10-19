import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { uploadToR2 } from '@/lib/r2';

/**
 * 上传图片到 Cloudflare R2
 * POST /api/upload
 * 
 * FormData:
 * - file: File (图片文件)
 */
export async function POST(request: Request) {
  try {
    // 验证登录
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 解析 FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '仅支持 PNG、JPEG、WebP 格式' },
        { status: 400 }
      );
    }

    // 验证文件大小（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过 10MB' },
        { status: 400 }
      );
    }

    // 上传到 R2
    const url = await uploadToR2(file, user.id);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[upload] error:', error);
    
    // 检查是否是配置错误
    if (error instanceof Error && error.message.includes('缺少 R2 配置')) {
      return NextResponse.json(
        { error: 'R2 存储未配置，请联系管理员' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传失败' },
      { status: 500 }
    );
  }
}
