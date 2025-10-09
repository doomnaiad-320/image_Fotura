import { describe, expect, it, vi } from "vitest";

import { encryptSecret } from "@/lib/crypto";

process.env.ENCRYPTION_KEY = "aigc-studio-dev-key-32bytes!!!@@";

const modelRecord = {
  id: "model1",
  slug: "mock-chat",
  displayName: "Mock Chat",
  enabled: true,
  pricing: { unit: "token", currency: "credit", inputPerK: 5, outputPerK: 10, minimum: 5 },
  supportsStream: true,
  modalities: ["text"],
  provider: {
    id: "provider1",
    slug: "mock",
    name: "Mock Provider",
    enabled: true,
    baseURL: "https://api.mock.com",
    apiKeyEncrypted: encryptSecret("secret-key"),
    extraHeaders: {}
  }
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiModel: {
      findUnique: vi.fn(async () => ({ ...modelRecord }))
    }
  }
}));

import { createOpenAIClient, resolveModel } from "@/lib/ai/client";

describe("ai client", () => {
  it("resolves model and decrypts api key", async () => {
    process.env.MOCK_AI = "0";
    const context = await resolveModel("mock-chat");
    expect(context.provider.slug).toBe("mock");
    const client = createOpenAIClient(context);
    expect(client).toBeInstanceOf(Object);
  });

  it("throws when provider missing api key in non-mock mode", async () => {
    process.env.MOCK_AI = "0";
    const prismaModule = await import("@/lib/prisma");
    (prismaModule.prisma.aiModel.findUnique as any).mockResolvedValueOnce({
      ...modelRecord,
      provider: {
        ...modelRecord.provider,
        apiKeyEncrypted: ""
      }
    });

    await expect(resolveModel("mock-chat")).rejects.toThrow("Provider 未配置 API Key");
  });
});
