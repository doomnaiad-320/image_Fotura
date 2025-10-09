import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = {
  user: { id: "user_1", credits: 1000 },
  transaction: null as any
};

vi.mock("@/lib/prisma", () => {
  const tx = {
    user: {
      findUnique: vi.fn(async () => ({ ...mockState.user })),
      update: vi.fn(async ({ data }: any) => {
        if (data.credits?.decrement) {
          mockState.user.credits -= data.credits.decrement;
        }
        if (data.credits?.increment) {
          mockState.user.credits += data.credits.increment;
        }
        return { ...mockState.user };
      })
    },
    creditTransaction: {
      create: vi.fn(async ({ data }: any) => {
        mockState.transaction = {
          id: data.id ?? "tx_1",
          userId: data.userId,
          delta: data.delta,
          status: data.status,
          metadata: data.metadata ?? "{}"
        };
        return { ...mockState.transaction };
      }),
      findUnique: vi.fn(async () => (mockState.transaction ? { ...mockState.transaction } : null)),
      update: vi.fn(async ({ data }: any) => {
        mockState.transaction = { ...mockState.transaction, ...data };
        return { ...mockState.transaction };
      })
    }
  };

  return {
    prisma: {
      $transaction: (callback: any) => callback(tx)
    }
  };
});

import { adjustCreditsByAdmin, finalizeCredits, prechargeCredits } from "@/lib/credits";

describe("credits", () => {
  beforeEach(() => {
    mockState.user.credits = 1000;
    mockState.transaction = null;
  });

  it("precharges and finalizes with adjustment", async () => {
    const precharged = await prechargeCredits({
      userId: "user_1",
      amount: 300,
      reason: "test",
      providerSlug: "mock",
      modelSlug: "chat"
    });

    expect(mockState.user.credits).toBe(700);
    expect(precharged.delta).toBe(-300);

    const finalized = await finalizeCredits(precharged.id, {
      status: "success",
      actualCost: 200,
      metadata: { promptTokens: 120 }
    });

    expect(finalized.delta).toBe(-200);
    expect(mockState.user.credits).toBe(800);
  });

  it("refunds to original state when finalize reports failure", async () => {
    const precharged = await prechargeCredits({
      userId: "user_1",
      amount: 150,
      reason: "test",
      providerSlug: "mock",
      modelSlug: "chat"
    });

    await finalizeCredits(precharged.id, {
      status: "failed",
      actualCost: 0
    });

    expect(mockState.user.credits).toBe(1000);
  });

  it("adjusts credits via admin helper", async () => {
    await adjustCreditsByAdmin({
      adminId: "admin_1",
      userId: "user_1",
      amount: 200,
      reason: "奖励"
    });
    expect(mockState.user.credits).toBe(1200);

    await adjustCreditsByAdmin({
      adminId: "admin_1",
      userId: "user_1",
      amount: -300,
      reason: "扣减"
    });
    expect(mockState.user.credits).toBe(900);
  });
});
