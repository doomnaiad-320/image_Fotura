import { PrismaClient } from "@prisma/client";

import { FALLBACK_ENCRYPTION_KEY, runSeed } from "../lib/seeds";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!@#";
  const userPassword = process.env.SEED_USER_PASSWORD ?? "User123!@#";

  const result = await runSeed(prisma, {
    adminPassword,
    userPassword,
    enforceEncryptionKey: process.env.ENCRYPTION_KEY ?? FALLBACK_ENCRYPTION_KEY
  });

  console.log("[seed] ✅ 数据初始化完成");
  console.log(`[seed] 管理员账号: ${result.admin.email} / ${adminPassword}`);
  console.log(`[seed] 普通用户账号: ${result.user.email} / ${userPassword}`);
  console.log(`[seed] 已导入模型数量: ${result.models.length}`);
}

main()
  .catch((err) => {
    console.error("[seed] ❌ 数据初始化失败", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
