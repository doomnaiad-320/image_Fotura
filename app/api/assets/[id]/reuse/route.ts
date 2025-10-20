import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 获取复用积分配置
async function getReusePointsConfig() {
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        in: ['reuse_points_min', 'reuse_points_max', 'reuse_points_current']
      }
    }
  });

  const config = {
    min: 10,
    max: 100,
    current: 50
  };

  settings.forEach((setting) => {
    const value = parseInt(setting.value, 10);
    if (setting.key === 'reuse_points_min') {
      config.min = value;
    } else if (setting.key === 'reuse_points_max') {
      config.max = value;
    } else if (setting.key === 'reuse_points_current') {
      config.current = value;
    }
  });

  return config;
}

// POST /api/assets/:id/reuse - 点击复用
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
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!asset) {
      return NextResponse.json(
        { error: '作品不存在' },
        { status: 404 }
      );
    }

    if (!asset.isPublic) {
      return NextResponse.json(
        { error: '作品未公开' },
        { status: 403 }
      );
    }

    // 3. 不能复用自己的作品
    if (asset.userId === userId) {
      return NextResponse.json(
        { error: '不能复用自己的作品' },
        { status: 400 }
      );
    }

    // 4. 使用作品的 reusePoints，如果为 0 则免费
    const chargeAmount = asset.reusePoints ?? 50;

    // 5. 检查用户余额（仅当需要扣费时）
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

    // 6. 事务处理：扣费 + 奖励判定
    const result = await prisma.$transaction(async (tx) => {
      let rewardGranted = false;

      // 仅当 chargeAmount > 0 时才进行扣费和奖励
      if (chargeAmount > 0) {
        // a. 扣除用户 B 的积分
        await tx.user.update({
          where: { id: userId },
          data: {
            credits: {
              decrement: chargeAmount
            }
          }
        });

        // 记录扣费交易
        await tx.creditTransaction.create({
          data: {
            userId,
            delta: -chargeAmount,
            reason: 'reuse_charge',
            status: 'success',
            refWorkId: assetId,
            refUserId: asset.userId || undefined,
            metadata: JSON.stringify({
              sourceWorkId: assetId,
              sourceWorkTitle: asset.title
            })
          }
        });

        // b. 查询是否已存在复用记录
        const existingRecord = await tx.reuseRecord.findUnique({
          where: {
            sourceWorkId_reuserId: {
              sourceWorkId: assetId,
              reuserId: userId
            }
          }
        });

        // c. 如果不存在记录且作品有作者，给作者奖励
        if (!existingRecord && asset.userId) {
          // 给作者 A 增加积分
          await tx.user.update({
            where: { id: asset.userId },
            data: {
              credits: {
                increment: chargeAmount
              }
            }
          });

          // 记录奖励交易
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

      // d. 创建或更新复用记录（无论是否扣费）
      await tx.reuseRecord.upsert({
        where: {
          sourceWorkId_reuserId: {
            sourceWorkId: assetId,
            reuserId: userId
          }
        },
        create: {
          sourceWorkId: assetId,
          reuserId: userId,
          rewardGranted
        },
        update: {
          // 重复复用不更新 rewardGranted
        }
      });

      return { rewardGranted };
    });

    // 7. 构建预填数据
    const prefillData = {
      prompt: asset.prompt || '',
      model: asset.model || '',
      modelName: asset.modelName || '',
      size: asset.size || '1024x1024',
      mode: asset.mode || 'txt2img',
      editChain: asset.editChain ? JSON.parse(asset.editChain) : {}
    };

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
