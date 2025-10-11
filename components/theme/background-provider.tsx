"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// 可选背景主题
export type BgTheme = "dark" | "light";

const THEME_STORAGE_KEY = "ui:bg-theme";

type ThemeCtx = {
  theme: BgTheme;
  setTheme: (t: BgTheme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<BgTheme>("dark");

  // 初始化从 localStorage 读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as BgTheme | null;
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
      }
    } catch {}
  }, []);

  // 持久化 + 写入 html data-theme
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBgTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBgTheme must be used within ThemeBackgroundProvider");
  return ctx;
}

// 全局背景层（固定定位，不干扰内容交互）
export function BackgroundLayer() {
  const { theme } = useBgTheme();

  const style = useMemo<React.CSSProperties>(() => {
    // 使用内联样式，避免 Tailwind JIT 对任意值类名的裁剪问题
    switch (theme) {
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
  }, [theme]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={style}
    />
  );
}
