import { prisma } from "@/lib/prisma";

/**
 * 系统设置服务层
 * 提供统一的设置读写接口
 */

export const SETTINGS_KEYS = {
  REGISTRATION_BONUS_CREDITS: "registration_bonus_credits",
} as const;

export type SettingKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

/**
 * 获取系统设置值
 * @param key 设置键名
 * @param defaultValue 默认值（如果设置不存在）
 */
export async function getSetting(
  key: SettingKey,
  defaultValue: string
): Promise<string> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key },
    });
    return setting?.value ?? defaultValue;
  } catch (error) {
    console.error(`[settings] Failed to get setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * 设置系统配置值
 * @param key 设置键名
 * @param value 设置值
 */
export async function setSetting(
  key: SettingKey,
  value: string
): Promise<void> {
  await prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * 获取整数类型的设置值
 * @param key 设置键名
 * @param defaultValue 默认值
 */
export async function getSettingInt(
  key: SettingKey,
  defaultValue: number
): Promise<number> {
  const value = await getSetting(key, String(defaultValue));
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 设置整数类型的配置值
 * @param key 设置键名
 * @param value 设置值
 */
export async function setSettingInt(
  key: SettingKey,
  value: number
): Promise<void> {
  await setSetting(key, String(value));
}

/**
 * 获取新用户注册赠送积分
 */
export async function getRegistrationBonusCredits(): Promise<number> {
  return getSettingInt(SETTINGS_KEYS.REGISTRATION_BONUS_CREDITS, 5000);
}

/**
 * 设置新用户注册赠送积分
 */
export async function setRegistrationBonusCredits(
  credits: number
): Promise<void> {
  if (credits < 0) {
    throw new Error("注册赠送积分不能为负数");
  }
  await setSettingInt(SETTINGS_KEYS.REGISTRATION_BONUS_CREDITS, credits);
}

/**
 * 批量获取多个设置
 */
export async function getSettings(keys: SettingKey[]): Promise<Record<string, string>> {
  const settings = await prisma.settings.findMany({
    where: { key: { in: keys as string[] } },
  });
  
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
}
