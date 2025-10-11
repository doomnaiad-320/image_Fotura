"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// 可选背景主题
export type BgTheme = "default" | "openai" | "claude";

const THEME_STORAGE_KEY = "ui:bg-theme";

type ThemeCtx = {
  theme: BgTheme;
  setTheme: (t: BgTheme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<BgTheme>("default");

  // 初始化从 localStorage 读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as BgTheme | null;
      if (saved === "default" || saved === "openai" || saved === "claude") {
        setTheme(saved);
      }
    } catch {}
  }, []);

  // 持久化
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
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

  const className = useMemo(() => {
    switch (theme) {
      case "openai":
        // 近似 ChatGPT 深灰蓝渐变
        return "bg-[radial-gradient(1200px_600px_at_50%_-100px,#3a3d4a_0%,#202123_60%,#0b0b0c_100%)]";
      case "claude":
        // 温和的米黄色渐变，透明叠加，保持暗色内容可读
        return "bg-[radial-gradient(1000px_500px_at_50%_-100px,rgba(247,242,231,0.12)_0%,rgba(235,226,207,0.08)_60%,transparent_100%)]";
      default:
        // 默认低对比度暗渐变
        return "bg-[radial-gradient(1200px_600px_at_50%_-120px,#1a1a1a_0%,#0e0e0e_60%,#000_100%)]";
    }
  }, [theme]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 ${className}`}
    />
  );
}
