"use client";

import type { LucideIcon } from "lucide-react";
import { Clock3, Moon, Sun } from "lucide-react";

import { useBgTheme, type BgTheme } from "@/components/theme/background-provider";
import { cn } from "@/lib/utils";

const OPTIONS: { key: BgTheme; label: string; icon: LucideIcon }[] = [
  { key: "light", label: "浅色", icon: Sun },
  { key: "auto", label: "自动", icon: Clock3 },
  { key: "dark", label: "深色", icon: Moon }
];

type ThemeToggleProps = {
  size?: "sm" | "md";
};

export function ThemeToggle({ size = "sm" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useBgTheme();
  const showLabel = size !== "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card/80 p-1 shadow-sm backdrop-blur",
        size === "sm" ? "gap-1" : "gap-2"
      )}
      role="group"
      aria-label="主题切换"
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setTheme(opt.key)}
            className={cn(
              "flex items-center justify-center rounded-full text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              size === "sm" ? "h-8 w-8" : "h-9 px-3",
              active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted/70"
            )}
            aria-pressed={active}
            title={`${opt.label}模式`}
          >
            <opt.icon
              className={cn(
                size === "sm" ? "h-4 w-4" : "mr-1.5 h-4 w-4",
                active ? "opacity-100" : "opacity-80"
              )}
            />
            {showLabel && <span>{opt.label}</span>}
          </button>
        );
      })}
      <span className="sr-only">
        {theme === "auto"
          ? `自动模式，当前为${resolvedTheme === "dark" ? "夜间" : "日间"}`
          : theme === "dark"
          ? "深色模式"
          : "浅色模式"}
      </span>
    </div>
  );
}
