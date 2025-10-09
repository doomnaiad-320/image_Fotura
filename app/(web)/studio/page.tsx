import { redirect } from "next/navigation";

import { AIPlayground } from "@/components/ai/playground";
import { listEnabledModelsForPlayground } from "@/lib/ai/models";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin?redirect=/studio");
  }

  const models = await listEnabledModelsForPlayground();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">创作工作台</h1>
        <p className="max-w-2xl text-sm text-gray-400">
          选择模型并直接调用图像生成接口，Credits 将在请求前预扣并在成功后结算。
        </p>
      </header>
      <AIPlayground models={models} isAuthenticated={Boolean(user)} />
    </div>
  );
}
