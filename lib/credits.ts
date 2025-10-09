import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";
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
        status: TransactionStatus.pending
      }
    });

    return transaction;
  });
}

export async function finalizeCredits(
  transactionId: string,
  data: {
    status: TransactionStatus;
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

    if (transaction.status !== TransactionStatus.pending) {
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

    if (transaction.status === TransactionStatus.refunded) {
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
        status: TransactionStatus.refunded,
        reason: reason ?? transaction.reason
      }
    });
  });
}
