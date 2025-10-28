import Link from "next/link";
import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/signup-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "注册 · AIGC Studio",
  description: "创建 AIGC Studio 账号"
};

export default function SignUpPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 rounded-3xl border border-default bg-surface/60 backdrop-blur-sm px-8 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">注册新账号</h1>
        <p className="text-sm text-muted-foreground">
          创建账户以管理模型、余额并保存你的灵感收藏。
        </p>
      </header>
      <SignUpForm />
      <p className="text-center text-xs text-muted-foreground">
        已有账号?{" "}
        <Link href="/auth/signin" className="underline text-link">
          直接登录
        </Link>
      </p>
    </div>
  );
}
