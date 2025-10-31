import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "@/components/navigation/user-menu";
import { ThemeToggle } from "@/components/navigation/theme-toggle";

export async function MainNavigation() {
  const user = await getCurrentUser();

return (
    <header className="sticky top-0 z-40 border-b border-border backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:border-[#4a4a4a] dark:bg-[#3a3a3a]/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link href={user ? "/studio" : "/"} className="text-lg font-semibold tracking-tight text-[#2a2a2a] dark:text-[#e5e5e5]">
          AIGC Studio
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="rounded-full border border-border px-4 py-1 text-foreground transition hover:bg-muted dark:border-[#5a5a5a] dark:text-[#b0b0b0] dark:hover:bg-[#4a4a4a]"
              >
                登录
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-[#c17c68] px-4 py-1 text-white transition hover:bg-[#c17c68]/90 dark:bg-[#d4856f] dark:hover:bg-[#d4856f]/90"
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
