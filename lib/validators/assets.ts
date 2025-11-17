import { z } from "zod";

// Prisma 中 Asset.type 使用的是字符串字段（"image" | "video"），而不是枚举类型
// 这里直接用 z.enum 约束可选值，避免运行时 AssetType 为 undefined 导致错误
const AssetTypeSchema = z.enum(["image", "video"]);

export const assetQuerySchema = z.object({
  type: z
    .union([z.literal("all"), AssetTypeSchema])
    .optional()
    .default("all"),
  sort: z
    .enum(["hot", "new"])
    .optional()
    .default("hot"),
  cursor: z.string().optional().nullable(),
  categoryId: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (typeof value === "number") return value;
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    })
    .pipe(z.number().min(1).max(60).optional())
});

export type AssetQuerySchema = z.infer<typeof assetQuerySchema>;
