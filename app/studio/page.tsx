import { redirect } from "next/navigation";

import { ConversationView } from "@/components/ai/conversation/conversation-view";
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
    <ConversationView 
      models={models} 
      isAuthenticated={Boolean(user)}
      user={user ? {
        email: user.email,
        credits: user.credits,
        role: user.role
      } : undefined}
    />
  );
}
