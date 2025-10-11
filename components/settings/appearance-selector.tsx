"use client";

import React from "react";
import { useBgTheme, type BgTheme } from "@/components/theme/background-provider";

const THEMES: { key: BgTheme; name: string; previewClass: string; desc: string }[] = [
  { key: "default", name: "默认", previewClass: "bg-gradient-to-b from-neutral-900 to-black", desc: "低对比度暗色渐变" },
  { key: "openai", name: "OpenAI 风格", previewClass: "bg-[radial-gradient(600px_300px_at_50%_-60px,#3a3d4a_0%,#202123_80%,#0b0b0c_100%)]", desc: "深灰蓝渐变" },
  { key: "claude", name: "Claude 风格", previewClass: "bg-[radial-gradient(600px_300px_at_50%_-60px,rgba(247,242,231,0.25)_0%,rgba(235,226,207,0.18)_60%,transparent_100%)]", desc: "温和米黄色叠加" },
];

export function AppearanceSelector() {
  const { theme, setTheme } = useBgTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {THEMES.map((t) => {
        const active = theme === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            className={`group rounded-md border p-3 text-left transition-colors ${active ? 'border-white/30' : 'border-white/10 hover:border-white/20'}`}
          >
            <div className={`h-20 w-full rounded-md ${t.previewClass}`} />
            <div className="mt-2">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
