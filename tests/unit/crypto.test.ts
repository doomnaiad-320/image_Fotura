import { describe, expect, it, beforeEach } from "vitest";

import { decryptSecret, encryptSecret } from "@/lib/crypto";

describe("crypto", () => {
  const key = "aigc-studio-dev-key-32bytes!!!@@";

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = key;
  });

  it("encrypts and decrypts secrets symmetrically", () => {
    const plaintext = "test-secret";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("handles empty values gracefully", () => {
    expect(encryptSecret("")).toBe("");
    expect(decryptSecret("")).toBe("");
  });
});
