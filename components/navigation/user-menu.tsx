"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import type { CurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBgTheme } from "@/components/theme/background-provider";

type Props = {
  user: CurrentUser;
};

export function UserMenu({ user }: Props) {
  const { theme, setTheme } = useBgTheme();

  return (
    <div className="flex items-center gap-3">
      <Badge className="bg-white/10 text-xs uppercase tracking-[0.2em] text-white">
        {user.credits} 豆
      </Badge>

      {/* Theme dropdown via icon */}
      <div className="relative">
        <button
          className="rounded-full border border-default p-1.5 text-foreground hover:bg-surface-2"
          aria-label="切换主题"
          title="切换主题"
          onClick={(e) => {
            const menu = (e.currentTarget.nextSibling as HTMLElement)!
            menu.classList.toggle('hidden');
          }}
        >
          {/* simple icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 2a7 7 0 110 14 7 7 0 010-14z" />
          </svg>
        </button>
        <div className="absolute right-0 z-50 mt-2 w-32 overflow-hidden rounded-md border border-default bg-surface shadow hidden" role="menu">
          <button
            className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${theme==='dark' ? 'opacity-100' : 'opacity-80'}`}
            onClick={(e)=>{ setTheme('dark'); (e.currentTarget.parentElement as HTMLElement).classList.add('hidden'); }}
          >
            Dark
          </button>
          <button
            className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${theme==='light' ? 'opacity-100' : 'opacity-80'}`}
            onClick={(e)=>{ setTheme('light'); (e.currentTarget.parentElement as HTMLElement).classList.add('hidden'); }}
          >
            Light
          </button>
        </div>
      </div>

      <Link
        href="/settings"
        className="rounded-full border border-default px-4 py-1 text-xs uppercase tracking-[0.2em] text-foreground transition hover:bg-surface-2"
      >
        控制台
      </Link>
      {user.role === "admin" && (
        <Link
          href="/admin/ai"
          className="rounded-full border border-default px-4 py-1 text-xs uppercase tracking-[0.2em] text-foreground transition hover:bg-surface-2"
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
