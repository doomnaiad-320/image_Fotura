import Link from "next/link";
import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/signin-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "登录 · AIGC Studio",
  description: "使用邮箱密码登录 AIGC Studio"
};

export default function SignInPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 rounded-3xl border border-default bg-surface/60 backdrop-blur-sm px-8 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">登录 AIGC Studio</h1>
        <p className="text-sm text-muted-foreground">
          输入邮箱与密码,即可访问你的创作空间。
        </p>
      </header>
      <SignInForm />
      <p className="text-center text-xs text-muted-foreground">
        还没有账号?{" "}
        <Link href="/auth/signup" className="underline text-link">
          立即注册
        </Link>
      </p>
    </div>
  );
}
