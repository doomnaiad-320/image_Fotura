import { redirect } from "next/navigation";

import { ConversationView } from "@/components/ai/conversation/conversation-view";
import { listEnabledModelsForPlayground } from "@/lib/ai/models";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudioV2Page() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin?redirect=/studio-v2");
  }

  const models = await listEnabledModelsForPlayground();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">创作工作台 V2</h1>
            <p className="max-w-2xl text-sm text-gray-400 mt-2">
              对话式 AI 工作台：通过聊天的方式生成图片，支持链式编辑和完整提示词累积。
            </p>
          </div>
          <a
            href="/studio"
            className="text-sm text-gray-400 hover:text-gray-300 underline"
          >
            返回经典版本
          </a>
        </div>
      </header>
      <ConversationView models={models} isAuthenticated={Boolean(user)} />
    </div>
  );
}
