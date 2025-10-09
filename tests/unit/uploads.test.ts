import { describe, expect, it } from "vitest";

import { fileToBuffer } from "@/lib/uploads";

describe("uploads", () => {
  it("accepts valid png file", async () => {
    const file = new File([new Uint8Array([0, 1, 2])], "mock.png", {
      type: "image/png"
    });
    const result = await fileToBuffer(file);
    expect(result.mimeType).toBe("image/png");
  });

  it("rejects oversized file", async () => {
    const bigArray = new Uint8Array(9 * 1024 * 1024);
    const file = new File([bigArray], "big.png", { type: "image/png" });
    await expect(fileToBuffer(file)).rejects.toThrow("文件过大");
  });

  it("rejects unsupported mime type", async () => {
    const file = new File([new Uint8Array([0, 1])], "mock.txt", {
      type: "text/plain"
    });
    await expect(fileToBuffer(file)).rejects.toThrow("仅支持");
  });
});
