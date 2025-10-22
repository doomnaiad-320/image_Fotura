import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/assets/:id/reuse - 点击复用（按作品ID一次购买，后续免费）
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: assetId } = params;
    const user = await getCurrentUser();

    // 1. 验证用户登录
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. 查询作品信息
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!asset) {
      return NextResponse.json(
        { error: '作品不存在' },
        { status: 404 }
      );
    }

    // 3. 不能复用自己的作品
    if (asset.userId === userId) {
      return NextResponse.json(
        { error: '不能复用自己的作品' },
        { status: 400 }
      );
    }

    // 4. 如果已复用（已购买），直接返回免费复用
    const existingRecord = await prisma.reuseRecord.findUnique({
      where: {
        sourceWorkId_reuserId: {
          sourceWorkId: assetId,
          reuserId: userId
        }
      }
    });

    const prefillData = {
      prompt: asset.prompt || '',
      model: asset.model || '',
      modelName: asset.modelName || '',
      size: asset.size || '1024x1024',
      mode: asset.mode || 'txt2img',
      editChain: asset.editChain ? JSON.parse(asset.editChain) : {}
    };

    if (existingRecord) {
      return NextResponse.json({
        success: true,
        charged: 0,
        rewardGranted: false,
        prefillData,
        message: '您已拥有该作品，复用免费'
      });
    }

    // 5. 未购买情况下：仅公开作品可复用
    // @ts-expect-error prisma types generated after migration
    if (!asset.isPublic || (asset as any).isDeleted) {
      return NextResponse.json(
        { error: '作品未公开' },
        { status: 403 }
      );
    }

    // 6. 使用作品的 reusePoints（首次复用按作品定价扣费；0 表示免费）
    const chargeAmount = asset.reusePoints ?? 50;

    // 6. 若需要扣费则校验余额
    if (chargeAmount > 0) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
      });

      if (!currentUser || currentUser.credits < chargeAmount) {
        return NextResponse.json(
          {
            error: '积分不足',
            required: chargeAmount,
            current: currentUser?.credits || 0
          },
          { status: 402 }
        );
      }
    }

    // 7. 事务处理：扣费 +（首次）奖励 + 写入复用记录
    const result = await prisma.$transaction(async (tx) => {
      let rewardGranted = false;

      if (chargeAmount > 0) {
        // a) 扣除购买者积分
        await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: chargeAmount } }
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            delta: -chargeAmount,
            reason: 'reuse_charge',
            status: 'success',
            refWorkId: assetId,
            refUserId: asset.userId || undefined,
            metadata: JSON.stringify({ sourceWorkId: assetId, sourceWorkTitle: asset.title })
          }
        });

        // b) 首次复用给作者奖励（如果存在作者）
        if (asset.userId) {
          await tx.user.update({
            where: { id: asset.userId },
            data: { credits: { increment: chargeAmount } }
          });

          await tx.creditTransaction.create({
            data: {
              userId: asset.userId,
              delta: chargeAmount,
              reason: 'reuse_reward',
              status: 'success',
              refWorkId: assetId,
              refUserId: userId,
              metadata: JSON.stringify({
                sourceWorkId: assetId,
                sourceWorkTitle: asset.title,
                reuserId: userId
              })
            }
          });

          rewardGranted = true;
        }
      }

      // c) 创建复用记录（首次购买即归属）
      await tx.reuseRecord.create({
        data: {
          sourceWorkId: assetId,
          reuserId: userId,
          rewardGranted
        }
      });

      return { rewardGranted };
    });

    // 8. 返回响应
    let message = '复用成功！';
    if (chargeAmount === 0) {
      message = '免费复用成功！';
    } else if (result.rewardGranted) {
      message = `复用成功！已扣除 ${chargeAmount} 积分，原作者获得 ${chargeAmount} 积分奖励`;
    } else {
      message = `复用成功！已扣除 ${chargeAmount} 积分`;
    }

    return NextResponse.json({
      success: true,
      charged: chargeAmount,
      rewardGranted: result.rewardGranted,
      prefillData,
      message
    });
  } catch (error: any) {
    console.error('[Reuse] POST error:', error);
    return NextResponse.json(
      { error: error.message || '复用失败' },
      { status: 500 }
    );
  }
}
