import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/assets/:id/delete - 软删除作品（作者或管理员）
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const asset = await prisma.asset.findUnique({ where: { id: params.id } });
    if (!asset) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 });
    }

    const isOwner = asset.userId === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: '无权限删除该作品' }, { status: 403 });
    }

    if ((asset as any).isDeleted) {
      return NextResponse.json({ success: true, message: '作品已删除' });
    }

    await prisma.asset.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        isPublic: false,
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, message: '已软删除' });
  } catch (error: any) {
    console.error('[AssetDelete] error:', error);
    return NextResponse.json({ error: error.message || '删除失败' }, { status: 500 });
  }
}
