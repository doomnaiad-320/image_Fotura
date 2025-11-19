"use client";

import { useMemo } from "react";

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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-full bg-muted/70 p-1 text-[11px] md:text-xs">
          {TYPE_OPTIONS.map((option) => {
            const isActive = value.type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    type: option.value,
                    categoryId: null,
                  })
                }
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-muted-foreground md:text-xs">
        {sortOptions.map((option) => {
          const isActive = value.sort === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...value, sort: option.value })}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                isActive ? "bg-muted text-foreground" : "hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
