import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 默认复用积分配置
const DEFAULT_REUSE_POINTS = {
  min: 10,
  max: 100,
  current: 50
};

// GET /api/settings/reuse-points - 获取当前复用积分配置
export async function GET() {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['reuse_points_min', 'reuse_points_max', 'reuse_points_current']
        }
      }
    });

    const config = {
      min: DEFAULT_REUSE_POINTS.min,
      max: DEFAULT_REUSE_POINTS.max,
      current: DEFAULT_REUSE_POINTS.current
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

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('[Settings] GET error:', error);
    return NextResponse.json(
      { error: '获取设置失败' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/reuse-points - 更新配置（仅管理员）
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { min, max, current } = body;

    // 验证参数
    if (min !== undefined && (typeof min !== 'number' || min < 0)) {
      return NextResponse.json(
        { error: 'min 必须是非负数' },
        { status: 400 }
      );
    }

    if (max !== undefined && (typeof max !== 'number' || max < 0)) {
      return NextResponse.json(
        { error: 'max 必须是非负数' },
        { status: 400 }
      );
    }

    if (current !== undefined && (typeof current !== 'number' || current < 0)) {
      return NextResponse.json(
        { error: 'current 必须是非负数' },
        { status: 400 }
      );
    }

    // 获取当前配置
    const currentSettings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['reuse_points_min', 'reuse_points_max', 'reuse_points_current']
        }
      }
    });

    const currentConfig = {
      min: DEFAULT_REUSE_POINTS.min,
      max: DEFAULT_REUSE_POINTS.max,
      current: DEFAULT_REUSE_POINTS.current
    };

    currentSettings.forEach((setting) => {
      const value = parseInt(setting.value, 10);
      if (setting.key === 'reuse_points_min') {
        currentConfig.min = value;
      } else if (setting.key === 'reuse_points_max') {
        currentConfig.max = value;
      } else if (setting.key === 'reuse_points_current') {
        currentConfig.current = value;
      }
    });

    // 应用更新
    const newConfig = {
      min: min !== undefined ? min : currentConfig.min,
      max: max !== undefined ? max : currentConfig.max,
      current: current !== undefined ? current : currentConfig.current
    };

    // 验证 current 在 [min, max] 范围内
    if (newConfig.current < newConfig.min || newConfig.current > newConfig.max) {
      return NextResponse.json(
        { error: `current (${newConfig.current}) 必须在 [${newConfig.min}, ${newConfig.max}] 范围内` },
        { status: 400 }
      );
    }

    // 验证 min <= max
    if (newConfig.min > newConfig.max) {
      return NextResponse.json(
        { error: `min (${newConfig.min}) 不能大于 max (${newConfig.max})` },
        { status: 400 }
      );
    }

    // 更新数据库（使用 upsert）
    await Promise.all([
      prisma.settings.upsert({
        where: { key: 'reuse_points_min' },
        create: { key: 'reuse_points_min', value: newConfig.min.toString() },
        update: { value: newConfig.min.toString() }
      }),
      prisma.settings.upsert({
        where: { key: 'reuse_points_max' },
        create: { key: 'reuse_points_max', value: newConfig.max.toString() },
        update: { value: newConfig.max.toString() }
      }),
      prisma.settings.upsert({
        where: { key: 'reuse_points_current' },
        create: { key: 'reuse_points_current', value: newConfig.current.toString() },
        update: { value: newConfig.current.toString() }
      })
    ]);

    // 写入审计日志
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_REUSE_POINTS_SETTINGS',
        description: `更新复用积分设置: min=${newConfig.min}, max=${newConfig.max}, current=${newConfig.current}`,
        metadata: JSON.stringify({
          oldConfig: currentConfig,
          newConfig
        })
      }
    });

    return NextResponse.json({
      success: true,
      config: newConfig
    });
  } catch (error: any) {
    console.error('[Settings] PUT error:', error);
    return NextResponse.json(
      { error: '更新设置失败' },
      { status: 500 }
    );
  }
}
