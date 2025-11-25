import { redirect } from "next/navigation";

import { listEnabledModelsForPlayground } from "@/lib/ai/models";
import { getCurrentUser } from "@/lib/auth";
import UserAssetLibrary from "@/components/asset/user-asset-library";

export const metadata = {
  title: "素材库 | AIGC Studio"
};

export default async function StudioAssetLibraryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin?redirect=/studio/assets");
  }

  const models = await listEnabledModelsForPlayground();

  return (
    <div className="min-h-screen bg-app">
      <UserAssetLibrary
        models={models}
        user={{
          id: user.id,
          credits: user.credits ?? 0
        }}
      />
    </div>
  );
}
