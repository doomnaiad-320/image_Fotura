"use client";

import { useMemo, type ChangeEvent } from "react";

import type { AssetSort } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export type AssetFilterState = {
  type: string | "all";
  sort: AssetSort;
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
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        {TYPE_OPTIONS.map((option) => {
          const isActive = value.type === option.value;
          return (
            <Button
              key={option.value}
              variant={isActive ? "primary" : "secondary"}
              size="sm"
              className={cn("rounded-full px-4", !isActive && "bg-transparent")}
              onClick={() => onChange({ ...value, type: option.value })}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span className="hidden md:inline">排序</span>
        <Select
          value={value.sort}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, sort: event.target.value as AssetSort })}
          className="w-32"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
