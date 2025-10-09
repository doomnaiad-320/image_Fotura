import { prisma } from "@/lib/prisma";

type AuditPayload = {
  action: string;
  description: string;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordAuditLog({
  action,
  description,
  userId,
  ip,
  userAgent,
  metadata
}: AuditPayload) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        description,
        userId: userId ?? undefined,
        ip: ip ?? undefined,
        userAgent: userAgent ?? undefined,
        metadata: metadata ? JSON.stringify(metadata) : "{}"
      }
    });
  } catch (error) {
    console.error("[audit] 记录失败", error);
  }
}
