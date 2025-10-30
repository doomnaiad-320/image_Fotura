"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";
import { LocalStorageManager } from "@/components/storage/local-storage-manager";
import { useBgTheme, type BgTheme } from "@/components/theme/background-provider";

const THEME_OPTIONS: { key: BgTheme; label: string }[] = [
  { key: "auto", label: "自动" },
  { key: "light", label: "浅色" },
  { key: "dark", label: "深色" },
];

export function AppearanceStoragePanel() {
  const { theme, setTheme } = useBgTheme();

  return (
    <div className="space-y-6">
      {/* 外观设置 */}
      <div className="rounded-lg border border-default bg-[var(--color-surface)] p-5">
        <div className="mb-3 text-base font-semibold text-foreground">界面外观</div>
        <div className="text-sm text-muted-foreground mb-4">选择你偏好的主题风格（自动：7:00-19:00 为浅色）</div>
        <div className="inline-flex rounded-md border border-default p-1">
          {THEME_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={theme === opt.key ? "primary" : "secondary"}
              className={`rounded-md ${theme === opt.key ? "" : "bg-transparent"}`}
              onClick={() => setTheme(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 本地存储管理（紧凑模式） */}
      <div className="rounded-lg border border-default bg-[var(--color-surface)] p-5">
        <div className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <Database className="h-4 w-4" /> 本地存储
        </div>
        <div className="text-sm text-muted-foreground mb-4">查看占用、清理旧记录、导入导出</div>
        <LocalStorageManager compact />
      </div>
    </div>
  );
}
