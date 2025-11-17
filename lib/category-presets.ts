import type { Category, PrismaClient } from "@prisma/client";

type CategoryPreset = {
  slug: string;
  name: string;
  sort: number;
};

const GALLERY_ROOT_PRESETS: CategoryPreset[] = [
  { slug: "image", name: "图片", sort: 10 },
  { slug: "video", name: "视频", sort: 20 }
];

const LEGACY_ROOT_SLUGS = ["type", "style"];

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

const IMAGE_CATEGORY_PRESETS: CategoryPreset[] = [
  ...TYPE_CATEGORIES.map((cat, index) => ({
    slug: cat.slug,
    name: cat.nameZh,
    sort: 10 + index * 10
  })),
  ...STYLE_CATEGORIES.map((cat, index) => ({
    slug: cat.slug,
    name: cat.nameZh,
    sort: 300 + index * 10
  }))
];

const VIDEO_CATEGORY_PRESETS: CategoryPreset[] = [];

export const DISPLAY_ROOT_SLUGS = GALLERY_ROOT_PRESETS.map((root) => root.slug);

export async function ensureGalleryCategoryStructure(prisma: PrismaClient) {
  const rootInstances = await Promise.all(
    GALLERY_ROOT_PRESETS.map((root) =>
      prisma.category.upsert({
        where: { slug: root.slug },
        update: {
          name: root.name,
          parentId: null,
          sort: root.sort,
          enabled: true
        },
        create: {
          name: root.name,
          slug: root.slug,
          sort: root.sort,
          enabled: true
        }
      })
    )
  );

  const rootMap = new Map<string, Category>();
  rootInstances.forEach((instance, index) => {
    rootMap.set(GALLERY_ROOT_PRESETS[index]?.slug ?? instance.slug, instance);
  });

  const imageRoot = rootMap.get("image");
  const videoRoot = rootMap.get("video");

  if (imageRoot) {
    const legacyRoots = await prisma.category.findMany({
      where: { slug: { in: LEGACY_ROOT_SLUGS } },
      select: { id: true }
    });

    for (const legacy of legacyRoots) {
      await prisma.category.updateMany({
        where: { parentId: legacy.id },
        data: { parentId: imageRoot.id }
      });
      await prisma.category
        .update({
          where: { id: legacy.id },
          data: { enabled: false }
        })
        .catch(() => {});
    }

    for (const preset of IMAGE_CATEGORY_PRESETS) {
      await prisma.category.upsert({
        where: { slug: preset.slug },
        update: {
          name: preset.name,
          parentId: imageRoot.id,
          sort: preset.sort,
          enabled: true
        },
        create: {
          name: preset.name,
          slug: preset.slug,
          parentId: imageRoot.id,
          sort: preset.sort,
          enabled: true
        }
      });
    }
  }

  if (videoRoot) {
    for (const preset of VIDEO_CATEGORY_PRESETS) {
      await prisma.category.upsert({
        where: { slug: preset.slug },
        update: {
          name: preset.name,
          parentId: videoRoot.id,
          sort: preset.sort,
          enabled: true
        },
        create: {
          name: preset.name,
          slug: preset.slug,
          parentId: videoRoot.id,
          sort: preset.sort,
          enabled: true
        }
      });
    }
  }

  return {
    imageRootId: imageRoot?.id ?? null,
    videoRootId: videoRoot?.id ?? null
  };
}
