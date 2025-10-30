"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

// 可选背景主题
export type BgTheme = "dark" | "light" | "auto";

const THEME_STORAGE_KEY = "ui:bg-theme";

type Resolved = "dark" | "light";

type ThemeCtx = {
  // 用户选择（可能是 auto）
  theme: BgTheme;
  // 实际生效（仅 dark/light）
  resolvedTheme: Resolved;
  setTheme: (t: BgTheme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

function computeAutoTheme(now = new Date()): Resolved {
  const h = now.getHours();
  return h >= 7 && h < 19 ? "light" : "dark";
}

function nextAutoSwitchDelay(now = new Date()): number {
  const h = now.getHours();
  const base = new Date(now);
  let next: Date;
  if (h >= 7 && h < 19) {
    // 下一次 19:00 切到 dark
    next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 19, 0, 0, 0);
  } else if (h >= 19) {
    // 下一次 明天 7:00 切到 light
    const tomorrow = new Date(base);
    tomorrow.setDate(base.getDate() + 1);
    next = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 7, 0, 0, 0);
  } else {
    // h < 7, 今天 7:00 切到 light
    next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 7, 0, 0, 0);
  }
  const ms = next.getTime() - now.getTime();
  return Math.max(ms, 0);
}

export function ThemeBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<BgTheme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<Resolved>("dark");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化从 localStorage 读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as BgTheme | null;
      if (saved === "dark" || saved === "light" || saved === "auto") {
        setTheme(saved);
      }
    } catch {}
  }, []);

  // 根据选择写入 storage，并处理实际 data-theme 与定时切换
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}

    // 清理旧定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current as any);
      timerRef.current = null;
    }

    const apply = (t: Resolved) => {
      setResolvedTheme(t);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", t);
      }
    };

    if (theme === "auto") {
      const now = new Date();
      const current = computeAutoTheme(now);
      apply(current);
      const delay = nextAutoSwitchDelay(now);
      timerRef.current = setTimeout(() => {
        const nextNow = new Date();
        apply(computeAutoTheme(nextNow));
        // 继续排下一次
        if (theme === "auto") {
          // 注意：依赖闭包中的 theme 值，此 effect 会在 theme 更变时重新运行
          const d2 = nextAutoSwitchDelay(nextNow);
          timerRef.current = setTimeout(() => {
            const n3 = new Date();
            apply(computeAutoTheme(n3));
          }, d2);
        }
      }, delay);
    } else {
      apply(theme);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current as any);
        timerRef.current = null;
      }
    };
  }, [theme]);

  // 页面重新可见时（从后台回到前台）在 auto 下立即校准一次
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        try {
          const saved = localStorage.getItem(THEME_STORAGE_KEY) as BgTheme | null;
          if (saved === "auto") {
            const t = computeAutoTheme(new Date());
            setResolvedTheme(t);
            document.documentElement.setAttribute("data-theme", t);
          }
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBgTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBgTheme must be used within ThemeBackgroundProvider");
  return ctx;
}

// 全局背景层（固定定位，不干扰内容交互）
export function BackgroundLayer() {
  const { resolvedTheme } = useBgTheme();

  const style = useMemo<React.CSSProperties>(() => {
    // 使用内联样式，避免 Tailwind JIT 对任意值类名的裁剪问题
    switch (resolvedTheme) {
      case "light":
        return {
          backgroundColor: "oklch(0.9818 0.0054 95.0986)",
          backgroundImage:
            "radial-gradient(1200px 600px at 50% -120px, oklch(0.9818 0.0054 95.0986 / 0.35) 0%, oklch(0.9818 0.0054 95.0986 / 0.18) 55%, oklch(0.9818 0.0054 95.0986 / 0.12) 100%)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover"
        };
      case "dark":
      default:
        return {
          backgroundColor: "#0D0D0D",
          backgroundImage:
            "radial-gradient(1200px 600px at 50% -120px, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 55%, transparent 100%)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover"
        };
    }
  }, [resolvedTheme]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={style}
    />
  );
}
