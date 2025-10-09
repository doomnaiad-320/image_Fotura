import type { Prisma } from "@prisma/client";

export type TokenPricingConfig = {
  unit: "token";
  currency: "credit";
  inputPerK: number;
  outputPerK: number;
  minimum: number;
};

export type ImagePricingConfig = {
  unit: "image";
  currency: "credit";
  base: number;
  editBase?: number;
  sizeMultipliers?: Record<string, number>;
};

export type PricingConfig = TokenPricingConfig | ImagePricingConfig;

export type ChatPricingInput = {
  pricing: Prisma.JsonValue;
  promptTokens: number;
  completionTokens: number;
};

export type ImagePricingInput = {
  pricing: Prisma.JsonValue;
  size?: string;
  quantity?: number;
  mode?: "generate" | "edit";
};

function parsePricing(pricing: Prisma.JsonValue): PricingConfig {
  if (!pricing || typeof pricing !== "object") {
    throw new Error("模型未配置定价");
  }
  const config = pricing as PricingConfig;
  if (config.unit === "token") {
    return {
      unit: "token",
      currency: "credit",
      inputPerK: Number((config as TokenPricingConfig).inputPerK ?? 10),
      outputPerK: Number((config as TokenPricingConfig).outputPerK ?? 30),
      minimum: Number((config as TokenPricingConfig).minimum ?? 15)
    } satisfies TokenPricingConfig;
  }
  return {
    unit: "image",
    currency: "credit",
    base: Number((config as ImagePricingConfig).base ?? 60),
    editBase: Number((config as ImagePricingConfig).editBase ?? (config as ImagePricingConfig).base ?? 60),
    sizeMultipliers: (config as ImagePricingConfig).sizeMultipliers ?? {
      "512x512": 1,
      "1024x1024": 1.6
    }
  } satisfies ImagePricingConfig;
}

export function calculateChatCost({
  pricing,
  promptTokens,
  completionTokens
}: ChatPricingInput): number {
  const config = parsePricing(pricing);
  if (config.unit !== "token") {
    throw new Error("定价配置不支持文本计费");
  }

  const inputCost = (promptTokens / 1000) * config.inputPerK;
  const outputCost = (completionTokens / 1000) * config.outputPerK;
  const total = Math.ceil(inputCost + outputCost);
  return Math.max(total, config.minimum);
}

export function calculateImageCost({
  pricing,
  size,
  quantity = 1,
  mode = "generate"
}: ImagePricingInput): number {
  const config = parsePricing(pricing);
  if (config.unit !== "image") {
    throw new Error("定价配置不支持图像计费");
  }

  const multiplier = size && config.sizeMultipliers?.[size] ? config.sizeMultipliers[size] : 1;
  const base = mode === "edit" && config.editBase ? config.editBase : config.base;
  return Math.ceil(base * multiplier * quantity);
}
