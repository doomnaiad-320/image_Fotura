import { prisma } from "@/lib/prisma";

export type UsageRecordInput = {
  requestId: string;
  userId?: string | null;
  modelId?: string | null;
  modelSlug?: string | null;
  providerSlug?: string | null;
  kind: "chat" | "image.generate" | "image.edit";
  status?: "pending" | "success" | "failed" | "refunded";
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
};

export async function createUsageRecord(input: UsageRecordInput) {
  return prisma.aiUsage.create({
    data: {
      requestId: input.requestId,
      userId: input.userId ?? undefined,
      modelId: input.modelId ?? undefined,
      modelSlug: input.modelSlug ?? undefined,
      providerSlug: input.providerSlug ?? undefined,
      kind: input.kind,
      status: input.status ?? "pending",
      durationMs: input.durationMs,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cost: input.cost ?? undefined
    }
  });
}

export async function updateUsageRecord(
  requestId: string,
  data: Partial<Omit<UsageRecordInput, "requestId" | "kind">> & {
    status?: "pending" | "success" | "failed" | "refunded";
  }
) {
  return prisma.aiUsage.updateMany({
    where: { requestId },
    data: {
      status: data.status,
      durationMs: data.durationMs,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: data.cost,
      providerSlug: data.providerSlug,
      modelSlug: data.modelSlug
    }
  });
}
