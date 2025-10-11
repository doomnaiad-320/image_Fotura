"use client";

import React from "react";
import { useBgTheme, type BgTheme } from "@/components/theme/background-provider";

const THEMES: { key: BgTheme; name: string; previewClass: string; desc: string }[] = [
  { key: "dark", name: "Dark", previewClass: "bg-neutral-900", desc: "深色主题" },
  { key: "light", name: "Light", previewClass: "bg-neutral-100", desc: "浅色主题" },
];

export function AppearanceSelector() {
  const { theme, setTheme } = useBgTheme();

  return (
    <div className="space-y-3">
      <label className="text-sm text-muted-foreground">选择主题</label>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        {THEMES.map((t) => (
          <option key={t.key} value={t.key}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
