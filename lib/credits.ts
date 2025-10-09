import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export type CreditPrechargeInput = {
  userId: string;
  amount: number;
  reason: string;
  providerId?: string;
  providerSlug?: string;
  modelId?: string;
  modelSlug?: string;
};

export async function prechargeCredits(input: CreditPrechargeInput) {
  if (input.amount <= 0) {
    throw new Error("扣费金额必须大于 0");
  }

  const transactionId = randomUUID();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { credits: true }
    });

    if (!user) {
      throw new Error("用户不存在");
    }

    if (user.credits < input.amount) {
      throw new Error("余额不足");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: {
        credits: { decrement: input.amount }
      }
    });

    const transaction = await tx.creditTransaction.create({
      data: {
        id: transactionId,
        userId: input.userId,
        providerId: input.providerId,
        providerSlug: input.providerSlug,
        modelId: input.modelId,
        modelSlug: input.modelSlug,
        delta: -input.amount,
        reason: input.reason,
        status: "pending"
      }
    });

    return transaction;
  });
}

export async function finalizeCredits(
  transactionId: string,
  data: {
    status: "pending" | "success" | "failed" | "refunded";
    actualCost?: number;
    metadata?: Record<string, unknown>;
  }
) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.creditTransaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      throw new Error("交易不存在");
    }

    if (transaction.status !== "pending") {
      return transaction;
    }

    let delta = transaction.delta;

    if (typeof data.actualCost === "number" && data.actualCost >= 0) {
      const precharged = Math.abs(transaction.delta);
      const actual = data.actualCost;
      const adjustment = precharged - actual;

      if (adjustment !== 0 && transaction.userId) {
        await tx.user.update({
          where: { id: transaction.userId },
          data: {
            credits: {
              increment: adjustment
            }
          }
        });
      }

      delta = -actual;
    }

    return tx.creditTransaction.update({
      where: { id: transactionId },
      data: {
        status: data.status,
        delta,
        metadata: data.metadata ?? transaction.metadata
      }
    });
  });
}

export async function refundCredits(transactionId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.creditTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
      throw new Error("交易不存在");
    }

    if (transaction.status === "refunded") {
      return transaction;
    }

    if (transaction.userId) {
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          credits: {
            increment: Math.abs(transaction.delta)
          }
        }
      });
    }

    return tx.creditTransaction.update({
      where: { id: transactionId },
      data: {
        status: "refunded",
        reason: reason ?? transaction.reason
      }
    });
  });
}

export async function adjustCreditsByAdmin({
  adminId,
  userId,
  amount,
  reason
}: {
  adminId: string;
  userId: string;
  amount: number;
  reason: string;
}) {
  if (!amount || amount === 0) {
    throw new Error("调整额度必须非零");
  }

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });

    if (!target) {
      throw new Error("用户不存在");
    }

    if (amount < 0 && target.credits < Math.abs(amount)) {
      throw new Error("余额不足，无法扣减");
    }

    if (amount > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { increment: amount }
        }
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: Math.abs(amount) }
        }
      });
    }

    return tx.creditTransaction.create({
      data: {
        id: randomUUID(),
        userId,
        delta: amount,
        reason,
        providerSlug: null,
        modelSlug: null,
        status: "success",
        metadata: JSON.stringify({
          adjustedBy: adminId,
          reason
        })
      }
    });
  });
}
