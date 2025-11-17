import { PrismaClient } from "@prisma/client";

import { ensureGalleryCategoryStructure } from "../lib/category-presets";

const prisma = new PrismaClient();

async function main() {
  console.log("[categories] ensuring 图片/视频 分类结构...");
  await ensureGalleryCategoryStructure(prisma);
  console.log("[categories] done.");
}

main()
  .catch((err) => {
    console.error("[categories] error", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
