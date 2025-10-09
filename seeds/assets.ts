import { AssetType } from "@prisma/client";

type SeedAsset = {
  title: string;
  type: AssetType;
  coverUrl: string;
  videoUrl?: string;
  aspectRatio: number;
  durationSec?: number;
  modelTag: string;
  tags: string[];
  likes: number;
  views: number;
  createdAt: Date;
};

export const seedAssets: SeedAsset[] = [
  {
    title: "未来城市的清晨光影",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.5,
    tags: ["赛博朋克", "建筑", "晨光"],
    likes: 324,
    views: 4120,
    modelTag: "sdxl-fusion",
    createdAt: new Date("2024-03-12T09:20:00Z")
  },
  {
    title: "山谷云海中的神秘寺庙",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 0.75,
    modelTag: "sdxl-fusion",
    tags: ["风景", "中国", "云海"],
    likes: 268,
    views: 3156,
    createdAt: new Date("2024-02-28T12:04:00Z")
  },
  {
    title: "霓虹街头的雨夜剪影",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1500043201824-986b0e1eda5f?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 0.9,
    modelTag: "midjourney-v6",
    tags: ["都市", "霓虹", "雨夜"],
    likes: 489,
    views: 6320,
    createdAt: new Date("2024-01-19T19:44:00Z")
  },
  {
    title: "低角度拍摄的现代办公楼",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1505849864904-0164a1b7832d?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.3,
    modelTag: "sdxl-architect",
    tags: ["建筑", "高楼", "极简"],
    likes: 152,
    views: 1803,
    createdAt: new Date("2024-03-01T07:18:00Z")
  },
  {
    title: "日落时的火星殖民地",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1462332420958-a05d1e002413?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.6,
    modelTag: "deepseek-space",
    tags: ["科幻", "火星", "建筑"],
    likes: 378,
    views: 4599,
    createdAt: new Date("2024-04-08T16:50:00Z")
  },
  {
    title: "水墨山水的虚拟现实版本",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1,
    modelTag: "sdxl-ink",
    tags: ["国风", "水墨", "山水"],
    likes: 298,
    views: 3308,
    createdAt: new Date("2024-02-02T11:12:00Z")
  },
  {
    title: "失落海底城的珊瑚花园",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.2,
    modelTag: "together-oceanic",
    tags: ["海底", "幻想", "珊瑚"],
    likes: 364,
    views: 4211,
    createdAt: new Date("2024-04-15T09:30:00Z")
  },
  {
    title: "复古黑白风的人像摄影",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1502164980785-f8aa41d53611?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 0.66,
    modelTag: "midjourney-portrait",
    tags: ["人像", "黑白", "复古"],
    likes: 415,
    views: 5330,
    createdAt: new Date("2024-03-05T15:06:00Z")
  },
  {
    title: "北欧极光与雪峰",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.5,
    modelTag: "sdxl-landscape",
    tags: ["极光", "风景", "冰雪"],
    likes: 531,
    views: 6558,
    createdAt: new Date("2024-01-29T23:11:00Z")
  },
  {
    title: "生物机械鸟类的细节艺术",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 0.85,
    modelTag: "deepseek-bio",
    tags: ["机械", "科幻", "生物"],
    likes: 267,
    views: 3120,
    createdAt: new Date("2024-02-18T20:41:00Z")
  },
  {
    title: "浪涌海浪的慢门拍摄",
    type: AssetType.video,
    coverUrl:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80",
    videoUrl:
      "https://cdn.coverr.co/videos/coverr-waves-at-sunset-8531/1080p.mp4",
    aspectRatio: 1.78,
    durationSec: 24,
    modelTag: "runway-gen2",
    tags: ["海浪", "慢动作", "自然"],
    likes: 612,
    views: 7840,
    createdAt: new Date("2024-04-02T06:20:00Z")
  },
  {
    title: "AI 复原的古代长安城",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80&sat=-100",
    aspectRatio: 1.4,
    modelTag: "deepseek-history",
    tags: ["历史", "中国风", "建筑"],
    likes: 452,
    views: 5440,
    createdAt: new Date("2024-03-16T14:42:00Z")
  },
  {
    title: "虚拟偶像的舞台巡演",
    type: AssetType.video,
    coverUrl:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    videoUrl:
      "https://cdn.coverr.co/videos/coverr-futuristic-woman-dancing-3741/1080p.mp4",
    aspectRatio: 1.78,
    durationSec: 19,
    modelTag: "pika-vid",
    tags: ["虚拟偶像", "演唱会", "舞台"],
    likes: 588,
    views: 7132,
    createdAt: new Date("2024-04-21T18:00:00Z")
  },
  {
    title: "森林里的拟态生物",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 0.8,
    modelTag: "midjourney-fauna",
    tags: ["森林", "幻想", "生物"],
    likes: 335,
    views: 3891,
    createdAt: new Date("2024-03-11T08:25:00Z")
  },
  {
    title: "极简主义的家居空间",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.2,
    modelTag: "sdxl-interior",
    tags: ["家居", "极简", "室内设计"],
    likes: 214,
    views: 2438,
    createdAt: new Date("2024-02-09T09:51:00Z")
  },
  {
    title: "古典乐团的动感光效",
    type: AssetType.video,
    coverUrl:
      "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?auto=format&fit=crop&w=1200&q=80",
    videoUrl:
      "https://cdn.coverr.co/videos/coverr-conductor-leading-orchestra-0159/1080p.mp4",
    aspectRatio: 1.78,
    durationSec: 27,
    modelTag: "runway-gen2",
    tags: ["音乐", "灯光", "舞台"],
    likes: 276,
    views: 3302,
    createdAt: new Date("2024-03-28T21:32:00Z")
  },
  {
    title: "云端图书馆的漫游者",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.1,
    modelTag: "deepseek-dream",
    tags: ["幻想", "书籍", "云朵"],
    likes: 301,
    views: 3568,
    createdAt: new Date("2024-01-26T18:22:00Z")
  },
  {
    title: "全息 UI 的工业设计草图",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.6,
    modelTag: "sdxl-product",
    tags: ["工业设计", "UI", "未来"],
    likes: 189,
    views: 2102,
    createdAt: new Date("2024-03-07T10:45:00Z")
  },
  {
    title: "北极星空下的悬疑科幻剧照",
    type: AssetType.video,
    coverUrl:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    videoUrl:
      "https://cdn.coverr.co/videos/coverr-astronaut-walking-in-ice-8044/1080p.mp4",
    aspectRatio: 1.78,
    durationSec: 22,
    modelTag: "pika-vid",
    tags: ["宇航员", "悬疑", "星空"],
    likes: 344,
    views: 4208,
    createdAt: new Date("2024-02-21T05:48:00Z")
  },
  {
    title: "AI 合成的当代时尚大片",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 0.75,
    modelTag: "midjourney-fashion",
    tags: ["时尚", "大片", "人像"],
    likes: 498,
    views: 6105,
    createdAt: new Date("2024-03-23T11:08:00Z")
  },
  {
    title: "未来城市的交通枢纽",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1522199992905-dc5d60e9d00f?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.3,
    modelTag: "sdxl-fusion",
    tags: ["交通", "未来", "城市"],
    likes: 376,
    views: 4543,
    createdAt: new Date("2024-04-04T13:16:00Z")
  },
  {
    title: "水下舞者的光影舞步",
    type: AssetType.video,
    coverUrl:
      "https://images.unsplash.com/photo-1517202383675-eb0a6e1078e8?auto=format&fit=crop&w=1200&q=80",
    videoUrl:
      "https://cdn.coverr.co/videos/coverr-elegant-underwater-dancer-0530/1080p.mp4",
    aspectRatio: 1.78,
    durationSec: 25,
    modelTag: "runway-gen2",
    tags: ["舞蹈", "水下", "光影"],
    likes: 402,
    views: 4988,
    createdAt: new Date("2024-02-12T04:12:00Z")
  },
  {
    title: "自适应机器人宠物",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1,
    modelTag: "deepseek-robotics",
    tags: ["机器人", "宠物", "家庭"],
    likes: 287,
    views: 3301,
    createdAt: new Date("2024-01-31T17:35:00Z")
  },
  {
    title: "草原星河的延时摄影",
    type: AssetType.video,
    coverUrl:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80&sat=-100",
    videoUrl:
      "https://cdn.coverr.co/videos/coverr-milky-way-over-hills-3845/1080p.mp4",
    aspectRatio: 1.78,
    durationSec: 31,
    modelTag: "pika-vid",
    tags: ["星空", "草原", "延时"],
    likes: 355,
    views: 4099,
    createdAt: new Date("2024-03-02T00:09:00Z")
  },
  {
    title: "AI 设计的智能家居中控台",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.45,
    modelTag: "sdxl-product",
    tags: ["智能家居", "中控台", "UI"],
    likes: 243,
    views: 2811,
    createdAt: new Date("2024-02-25T13:37:00Z")
  },
  {
    title: "次世代电竞舞台概念设计",
    type: AssetType.image,
    coverUrl:
      "https://images.unsplash.com/photo-1529245019870-59dd2b46c023?auto=format&fit=crop&w=1200&q=80",
    aspectRatio: 1.33,
    modelTag: "deepseek-space",
    tags: ["电竞", "舞台", "灯光"],
    likes: 312,
    views: 3788,
    createdAt: new Date("2024-03-30T20:05:00Z")
  }
];
