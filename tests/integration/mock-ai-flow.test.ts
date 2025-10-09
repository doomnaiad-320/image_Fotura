import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.ENCRYPTION_KEY = "aigc-studio-dev-key-32bytes!!!@@";
process.env.MOCK_AI = "1";

const state = {
  user: { id: "user_1", credits: 500 },
  model: {
    id: "model_1",
    slug: "mock-image",
    displayName: "Mock Image",
    pricing: { unit: "image", currency: "credit", base: 60 },
    modalities: ["image"],
    supportsStream: false,
    provider: {
      id: "provider_1",
      slug: "mock",
      name: "Mock Provider",
      enabled: true,
      baseURL: "https://mock.api",
      apiKeyEncrypted: "",
      extraHeaders: {}
    },
    enabled: true
  },
  transaction: null as any,
  usages: [] as any[]
};

vi.mock("@/lib/prisma", () => {
  const tx = {
    user: {
      findUnique: vi.fn(async () => ({ credits: state.user.credits })),
      update: vi.fn(async ({ data }: any) => {
        if (data.credits?.decrement) {
          state.user.credits -= data.credits.decrement;
        }
        if (data.credits?.increment) {
          state.user.credits += data.credits.increment;
        }
        return { ...state.user };
      })
    },
    creditTransaction: {
      create: vi.fn(async ({ data }: any) => {
        state.transaction = {
          ...data,
          id: data.id,
          status: data.status,
          delta: data.delta
        };
        return { ...state.transaction };
      }),
      findUnique: vi.fn(async () => ({ ...state.transaction })),
      update: vi.fn(async ({ data }: any) => {
        state.transaction = { ...state.transaction, ...data };
        return { ...state.transaction };
      })
    }
  };

  return {
    prisma: {
      aiModel: {
        findUnique: vi.fn(async () => ({ ...state.model }))
      },
      user: {
        findUnique: vi.fn(async () => ({ credits: state.user.credits }))
      },
      aiUsage: {
        create: vi.fn(async ({ data }: any) => {
          state.usages.push({ ...data });
          return data;
        }),
        updateMany: vi.fn(async ({ data }: any) => {
          state.usages = state.usages.map((usage) => ({ ...usage, ...data }));
          return { count: state.usages.length };
        })
      },
      $transaction: (callback: any) => callback(tx)
    }
  };
});

import { generateImages } from "@/lib/ai/images";

describe("mock ai image flow", () => {
  beforeEach(() => {
    state.user.credits = 500;
    state.transaction = null;
    state.usages = [];
  });

  it("completes mock image generation and settles credits", async () => {
    const result = await generateImages({
      userId: state.user.id,
      modelSlug: state.model.slug,
      prompt: "test prompt",
      size: "512x512",
      quantity: 1,
      responseFormat: "url"
    });

    expect(result.data).toHaveLength(1);
    expect(state.usages[0].kind).toBe("image.generate");
    expect(state.transaction.status).toBe("success");
    expect(state.user.credits).toBe(490);
  });
});
