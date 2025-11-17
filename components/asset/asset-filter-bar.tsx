"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { AssetSort } from "@/lib/assets";
import { cn } from "@/lib/utils";

export type AssetFilterState = {
  type: string | "all";
  sort: AssetSort;
  categoryId?: string | null;
};

export type AssetFilterBarProps = {
  value: AssetFilterState;
  onChange: (state: AssetFilterState) => void;
};

const TYPE_OPTIONS: { value: string | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "image", label: "图片" },
  { value: "video", label: "视频" }
];

const SORT_OPTIONS: { value: AssetSort; label: string }[] = [
  { value: "hot", label: "热门" },
  { value: "new", label: "最新" }
];

export function AssetFilterBar({ value, onChange }: AssetFilterBarProps) {
  const sortOptions = useMemo(() => SORT_OPTIONS, []);

  return (
<div className="flex flex-col gap-4 rounded-3xl border border-default bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        {TYPE_OPTIONS.map((option) => {
          const isActive = value.type === option.value;
          return (
            <Button
              key={option.value}
              variant={isActive ? "primary" : "secondary"}
              size="sm"
              className={cn("rounded-full px-4", !isActive && "bg-transparent")}
              onClick={() =>
                onChange({
                  ...value,
                  type: option.value,
                  categoryId: null
                })
              }
            >
              {option.label}
            </Button>
          );
        })}
      </div>
<div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="hidden md:inline">排序</span>
        <div className="inline-flex rounded-full bg-muted p-1">
          {sortOptions.map((option) => {
            const isActive = value.sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...value, sort: option.value })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition",
                  isActive ? "bg-foreground text-background" : "text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
