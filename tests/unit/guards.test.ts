import { describe, expect, it, vi } from "vitest";

const mockState = {
  credits: 50
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => ({ credits: mockState.credits }))
    }
  }
}));

import { ensureUserHasCredits } from "@/lib/ai/guards";

describe("guards", () => {
  it("throws when credits are insufficient", async () => {
    mockState.credits = 10;
    await expect(ensureUserHasCredits("user", 20)).rejects.toThrow("余额不足");
  });

  it("passes when credits sufficient", async () => {
    mockState.credits = 100;
    await expect(ensureUserHasCredits("user", 20)).resolves.toBeUndefined();
  });
});
