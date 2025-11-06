"use client";

import React from "react";
import { useBgTheme, type BgTheme } from "@/components/theme/background-provider";
import { Select } from "@/components/ui/select";

const THEMES: { key: BgTheme; name: string; previewClass: string; desc: string }[] = [
  { key: "auto", name: "自动", previewClass: "", desc: "根据本地时间 7:00-19:00 浅色，其余深色" },
  { key: "dark", name: "深色", previewClass: "bg-neutral-900", desc: "深色主题" },
  { key: "light", name: "浅色", previewClass: "bg-neutral-100", desc: "浅色主题" },
];

export function AppearanceSelector() {
  const { theme, setTheme } = useBgTheme();

  return (
    <div className="space-y-3">
      <label className="text-sm text-muted-foreground">选择主题</label>
      <Select
        value={theme}
        onChange={(e) => setTheme(e.target.value as BgTheme)}
        className="w-full"
      >
        {THEMES.map((t) => (
          <option key={t.key} value={t.key}>{t.name}</option>
        ))}
      </Select>
    </div>
  );
}
