"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import type { CurrentUser } from "@/lib/auth";
import { useBgTheme } from "@/components/theme/background-provider";
import { UserStar } from "lucide-react";

type Props = {
  user: CurrentUser;
};

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const initial = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
<button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-semibold">
          {initial}
        </span>
        <span className="hidden text-sm text-muted-foreground sm:block">{user.email}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/90">
          {user.credits} 豆
        </span>
        <svg className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

{open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
        >
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {user.email}
          </div>
          <Link
            href="/me"
className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <UserStar className="h-4 w-4" />
            个人主页
          </Link>
          <Link
            href="/studio/assets"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" /></svg>
            我的素材
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            设置
          </Link>
          <Link
            href="/studio"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            创意工作室
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin/ai"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
              onClick={() => setOpen(false)}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              管理后台
            </Link>
          )}
<div className="my-1 h-px bg-border" />
          <button
            onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
