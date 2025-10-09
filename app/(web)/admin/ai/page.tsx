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

  const modelView = models.map((model) => ({
    slug: model.slug,
    displayName: model.displayName,
    provider: model.provider,
    modalities: (model.modalities as string[]) ?? [],
    supportsStream: model.supportsStream,
    enabled: model.enabled,
    sort: model.sort
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">AI Provider 管理</h1>
        <p className="text-sm text-gray-400">
          配置多模型 Provider，导入模型清单并控制启用状态，所有修改自动写入数据库。
        </p>
      </header>
      <AdminAIConsole initialProviders={providerView} initialModels={modelView} />
    </div>
  );
}
