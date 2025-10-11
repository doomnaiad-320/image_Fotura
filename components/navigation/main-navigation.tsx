import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "@/components/navigation/user-menu";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/explore", label: "探索" },
  { href: "/studio", label: "工作台" },
  { href: "/mobile", label: "移动端" }
];

export async function MainNavigation() {
  const user = await getCurrentUser();

return (
    <header className="sticky top-0 z-40 border-b border-default backdrop-blur supports-[backdrop-filter]:bg-[var(--color-nav-bg)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            AIGC Studio
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
className="text-foreground transition hover:text-muted-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
className="text-foreground transition hover:text-muted-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link
                href="/auth/signin"
className="rounded-full border border-default px-4 py-1 text-foreground transition hover:bg-surface-2"
              >
                登录
              </Link>
              <Link
                href="/auth/signup"
className="rounded-full bg-[var(--color-primary)] px-4 py-1 text-[var(--color-primary-foreground)] transition hover:opacity-90"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
