import { redirect } from "next/navigation";

import { AdminAIConsole } from "@/components/admin/ai-console";
import { ensureAdmin } from "@/lib/ai/guards";
import { listProviders } from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAIPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin?redirect=/admin/ai");
  }
  try {
    ensureAdmin(user.role);
  } catch {
    redirect("/");
  }

  const [providers, models] = await Promise.all([
    listProviders(),
    prisma.aiModel.findMany({
      include: {
        provider: {
          select: {
            slug: true,
            name: true
          }
        }
      },
      orderBy: [{ provider: { name: "asc" } }, { sort: "asc" }]
    })
  ]);

  const providerView = providers.map((provider) => ({
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    baseURL: provider.baseURL,
    enabled: provider.enabled,
    hasApiKey: Boolean(provider.hasApiKey),
    createdAt: provider.createdAt.toISOString()
  }));

  const parseModalities = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parsePricing = (value: unknown): Record<string, unknown> | null => {
    if (!value) {
      return null;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }
    if (typeof value === "object") {
      return value as Record<string, unknown>;
    }
    return null;
  };

  const modelView = models.map((model) => ({
    slug: model.slug,
    displayName: model.displayName,
    provider: model.provider,
    modalities: parseModalities(model.modalities),
    tags: parseModalities(model.tags),
    supportsStream: model.supportsStream,
    enabled: model.enabled,
    isPromptOptimizer: model.isPromptOptimizer,
    sort: model.sort,
    pricing: parsePricing(model.pricing)
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">AI 管理中心</h1>
        <p className="text-sm text-gray-400">
          统一管理 Provider、模型库、用户积分与操作日志，所有变更实时记录。
        </p>
      </header>
      <AdminAIConsole initialProviders={providerView} initialModels={modelView} />
    </div>
  );
}
