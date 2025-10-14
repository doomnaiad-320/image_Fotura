import { redirect } from "next/navigation";

import { AIPlaygroundAdvanced } from "@/components/ai/playground-advanced";
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">创作工作台</h1>
            <p className="max-w-2xl text-sm text-gray-400 mt-2">
              选择模型并直接调用图像生成接口，支持连续编辑和局部涂选，豆将在请求前预扣并在成功后结算。
            </p>
          </div>
          <a
            href="/studio-v2"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>体验对话式工作台</span>
          </a>
        </div>
      </header>
      <AIPlaygroundAdvanced models={models} isAuthenticated={Boolean(user)} />
    </div>
  );
}
