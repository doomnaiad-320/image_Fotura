import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/ai/guards";
import { getCurrentUser } from "@/lib/auth";
import {
  SETTINGS_KEYS,
  getSettings,
  setRegistrationBonusCredits,
  getRegistrationBonusCredits,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 * 获取所有系统设置
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    ensureAdmin(user.role);

    const settings = await getSettings(
      Object.values(SETTINGS_KEYS) as typeof SETTINGS_KEYS[keyof typeof SETTINGS_KEYS][]
    );

    // 获取实际值，如果不存在则使用默认值
    const registrationBonusCredits = await getRegistrationBonusCredits();

    return NextResponse.json({
      settings: {
        [SETTINGS_KEYS.REGISTRATION_BONUS_CREDITS]: registrationBonusCredits,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取设置失败";
    return NextResponse.json({ message }, { status: 403 });
  }
}

const updateSchema = z.object({
  key: z.enum([SETTINGS_KEYS.REGISTRATION_BONUS_CREDITS]),
  value: z.union([z.string(), z.number()]),
});

/**
 * PUT /api/admin/settings
 * 更新系统设置
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    ensureAdmin(user.role);

    const body = await request.json();
    const { key, value } = updateSchema.parse(body);

    // 根据不同的设置键处理不同的更新逻辑
    if (key === SETTINGS_KEYS.REGISTRATION_BONUS_CREDITS) {
      const credits = typeof value === "number" ? value : parseInt(String(value), 10);
      if (isNaN(credits) || credits < 0) {
        return NextResponse.json(
          { message: "积分值必须为非负整数" },
          { status: 400 }
        );
      }
      await setRegistrationBonusCredits(credits);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "参数验证失败", errors: error.errors },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "更新设置失败";
    return NextResponse.json({ message }, { status: 500 });
  }
}
