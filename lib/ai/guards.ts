import { prisma } from "@/lib/prisma";

export class GuardError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function ensureUserHasCredits(userId: string, cost: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true }
  });
  if (!user) {
    throw new GuardError("用户不存在", 401);
  }
  if (user.credits < cost) {
    throw new GuardError("余额不足，请先充值或申请额度", 402);
  }
}

export function ensureAdmin(role: string) {
  if (role !== "admin") {
    throw new GuardError("仅管理员可执行该操作", 403);
  }
}

export async function ensureModelEnabled(slug: string) {
  const model = await prisma.aiModel.findUnique({
    where: { slug },
    select: { enabled: true }
  });
  if (!model || !model.enabled) {
    throw new GuardError("模型已禁用或不存在", 404);
  }
}
