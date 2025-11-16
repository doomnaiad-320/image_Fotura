import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOTS = [
  { slug: "type", name: "内容类型", sort: 10 },
  { slug: "style", name: "风格", sort: 20 }
] as const;

const TYPE_CATEGORIES = [
  { slug: "portrait", nameZh: "人像" },
  { slug: "landscape", nameZh: "风景" },
  { slug: "cityscape", nameZh: "城市风光" },
  { slug: "nature", nameZh: "自然景观" },
  { slug: "product", nameZh: "产品图 / 电商图" },
  { slug: "ui", nameZh: "UI / 网页" },
  { slug: "illustration", nameZh: "插画" },
  { slug: "concept-art", nameZh: "概念设计 / 原画" },
  { slug: "poster", nameZh: "海报 / 宣传图" },
  { slug: "logo", nameZh: "Logo / 品牌标志" },
  { slug: "wallpaper", nameZh: "壁纸" },
  { slug: "comic", nameZh: "漫画 / 分镜" },
  { slug: "icon", nameZh: "图标" }
] as const;

const STYLE_CATEGORIES = [
  { slug: "realistic", nameZh: "写实" },
  { slug: "photo", nameZh: "摄影风 / 照片感" },
  { slug: "cinematic", nameZh: "电影感" },
  { slug: "anime", nameZh: "二次元 / 动漫" },
  { slug: "manga", nameZh: "漫画风" },
  { slug: "watercolor", nameZh: "水彩" },
  { slug: "oil-painting", nameZh: "油画" },
  { slug: "sketch", nameZh: "素描 / 线稿" },
  { slug: "ink", nameZh: "水墨 / 国画" },
  { slug: "flat", nameZh: "扁平插画" },
  { slug: "3d", nameZh: "3D 渲染" },
  { slug: "lowpoly", nameZh: "低多边形" },
  { slug: "pixel", nameZh: "像素风" },
  { slug: "cyberpunk", nameZh: "赛博朋克" },
  { slug: "vaporwave", nameZh: "蒸汽波 / 霓虹复古" },
  { slug: "retro", nameZh: "复古 / 怀旧" },
  { slug: "minimalism", nameZh: "极简" },
  { slug: "kawaii", nameZh: "可爱 / 萌系" },
  { slug: "fantasy", nameZh: "奇幻" },
  { slug: "sci-fi", nameZh: "科幻" },
  { slug: "chinese-style", nameZh: "国风 / 古风" },
  { slug: "underwater", nameZh: "水下风格" }
] as const;

async function main() {
  console.log("[add-image-categories] ensuring default image categories...");

  // 确保两个根分类存在：内容类型 / 风格
  const rootMap: Record<string, string> = {};

  for (const root of ROOTS) {
    const created = await prisma.category.upsert({
      where: { slug: root.slug },
      update: {
        name: root.name,
        parentId: null,
        sort: root.sort
      },
      create: {
        name: root.name,
        slug: root.slug,
        sort: root.sort
      }
    });
    rootMap[root.slug] = created.id;
  }

  // 写入内容类型子分类（挂在 "type" 根分类下）
  let sort = 10;
  for (const cat of TYPE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.nameZh,
        parentId: rootMap["type"],
        sort
      },
      create: {
        name: cat.nameZh,
        slug: cat.slug,
        parentId: rootMap["type"],
        sort
      }
    });
    sort += 10;
  }

  // 写入风格子分类（挂在 "style" 根分类下）
  sort = 10;
  for (const cat of STYLE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.nameZh,
        parentId: rootMap["style"],
        sort
      },
      create: {
        name: cat.nameZh,
        slug: cat.slug,
        parentId: rootMap["style"],
        sort
      }
    });
    sort += 10;
  }

  console.log("[add-image-categories] done.");
}

main()
  .catch((err) => {
    console.error("[add-image-categories] error", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });