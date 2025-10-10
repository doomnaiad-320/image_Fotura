"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import type { CurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  user: CurrentUser;
};

export function UserMenu({ user }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Badge className="bg-white/10 text-xs uppercase tracking-[0.2em] text-white">
        {user.credits} 豆
      </Badge>
      {user.role === "admin" && (
        <Link
          href="/admin/ai"
          className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-gray-300 transition hover:border-white/40"
        >
          管理后台
        </Link>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        退出
      </Button>
    </div>
  );
}
