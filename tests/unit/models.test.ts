import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  provider: { id: "provider_1", slug: "mock" },
  existingModels: [
    { id: "1", slug: "model-a", providerId: "provider_1", enabled: true },
    { id: "2", slug: "model-b", providerId: "provider_1", enabled: true }
  ],
  upserted: [] as string[],
  disabled: [] as string[]
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    provider: {
      findUnique: vi.fn(async () => state.provider)
    },
    aiModel: {
      findMany: vi.fn(async () => state.existingModels),
      upsert: vi.fn(async ({ where }: any) => {
        state.upserted.push(where.slug);
      }),
      update: vi.fn(async ({ where }: any) => {
        state.disabled.push(where.id ?? where.slug);
      })
    }
  }
}));

import { importRemoteModels } from "@/lib/ai/models";

describe("importRemoteModels", () => {
  beforeEach(() => {
    state.upserted = [];
    state.disabled = [];
  });

  it("upserts new models and disables removed ones", async () => {
    await importRemoteModels("mock", [
      { id: "model-a", name: "Model A" },
      { id: "model-c", name: "Model C" }
    ] as any);

    expect(state.upserted).toEqual(expect.arrayContaining(["model-a", "model-c"]));
    expect(state.disabled).toContain("2");
  });
});
