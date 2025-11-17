/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // 清理 userId 为空或占位图片链接的旧数据
  const deleted = await prisma.asset.deleteMany({
    where: {
      OR: [{ userId: null }, { coverUrl: { contains: "images.unsplash.com" } }]
    }
  });

  console.log(`[cleanup] 已删除 ${deleted.count} 条占位作品`);
}

main()
  .catch((err) => {
    console.error("[cleanup] 删除占位作品失败", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
