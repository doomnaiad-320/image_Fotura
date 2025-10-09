import { AssetType } from "@prisma/client";
import { z } from "zod";

export const assetQuerySchema = z.object({
  type: z
    .union([z.literal("all"), z.nativeEnum(AssetType)])
    .optional()
    .default("all"),
  sort: z
    .enum(["hot", "new"])
    .optional()
    .default("hot"),
  cursor: z.string().optional().nullable(),
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
