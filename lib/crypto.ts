import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("缺少 ENCRYPTION_KEY 环境变量");
  }

  const normalized = secret.trim();
  const key =
    normalized.length === 32
      ? Buffer.from(normalized, "utf8")
      : Buffer.from(normalized, "hex");

  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY 必须是 32 字节（256 位）");
  }

  return key;
}

export function encryptSecret(plainText: string): string {
  if (!plainText) {
    return "";
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64")
  ].join(".");
}

export function decryptSecret(payload: string): string {
  if (!payload) {
    return "";
  }

  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("密文格式不正确");
  }

  const [ivB64, encryptedB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("密文向量或标签长度不正确");
  }

  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}
