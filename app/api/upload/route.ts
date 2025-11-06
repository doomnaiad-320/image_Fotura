import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { uploadToR2, uploadBufferToR2 } from '@/lib/r2';

// 明确使用 Node.js 运行时，避免 Edge 运行时导致的 Buffer/crypto 等问题
export const runtime = 'nodejs';
// 强制动态，防止被缓存
export const dynamic = 'force-dynamic';

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

    // 优先使用服务端压缩并生成多规格 WebP，仅在云端存派生图
    let useSharp = true;
    let sharp: any = null;
    try {
      // 运行时动态导入，避免在构建阶段解析到 'sharp' 导致 Module not found
      const pkg = ['sh', 'arp'].join('');
      const dynamicImport = new Function('m', 'return import(m)');
      const mod: any = await (dynamicImport as any)(pkg);
      sharp = mod?.default || mod;
    } catch {
      useSharp = false;
    }

    if (useSharp && sharp) {
      const arrayBuf = await file.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuf);
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha1').update(inputBuffer).digest('hex').slice(0, 12);

      const base = sharp(inputBuffer, { failOn: 'none' }).rotate().removeMetadata();
      const widths = [320, 1024, 2048];
      const quality = 75;
      const userPrefix = `images/${user.id}/${hash}`;
      const cacheControl = 'public, max-age=31536000, immutable';

      let coverUrl = '';
      for (const w of widths) {
        const out = await base
          .clone()
          .resize({ width: w, height: w, fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        const key = `${userPrefix}/${w}.webp`;
        const url = await uploadBufferToR2(key, out, 'image/webp', cacheControl);
        if (w === 1024) {
          coverUrl = url; // 默认用 1024 作为封面
        }
      }
      // 如果没有生成 1024（极小图），回退为 320 或 2048 中最大的可用
      if (!coverUrl) {
        coverUrl = `${process.env.R2_PUBLIC_URL!}/${userPrefix}/1024.webp`;
      }

      return NextResponse.json({ url: coverUrl, variantsBase: `${process.env.R2_PUBLIC_URL!}/${userPrefix}/` });
    }

    // Fallback: 无 sharp 时直接原图上传
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
