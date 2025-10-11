import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserSettings } from "@/components/settings/user-settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "个人设置 - AIGC Studio",
  description: "管理你的个人数据、消费记录和存储空间",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin?redirect=/settings");
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <UserSettings />
    </div>
  );
}
