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
    <div className="mx-auto flex max-w-md flex-col gap-8 rounded-3xl border border-white/10 bg-black/40 px-8 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">登录 AIGC Studio</h1>
        <p className="text-sm text-gray-400">
          输入邮箱与密码，即可访问你的创作空间。
        </p>
      </header>
      <SignInForm />
      <p className="text-center text-xs text-gray-500">
        还没有账号？{" "}
        <Link href="/auth/signup" className="underline">
          立即注册
        </Link>
      </p>
    </div>
  );
}
