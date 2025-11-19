"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AssetSort } from "@/lib/assets";

// Types
type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  children: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export type InspirationFilterState = {
  type: string | "all";
  sort: AssetSort;
  categoryId: string | null;
};

type InspirationCategoryNavProps = {
  value: InspirationFilterState;
  onChange: (state: InspirationFilterState) => void;
  className?: string;
};

const TYPE_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "image", label: "图片" },
  { value: "video", label: "视频" },
];

const SORT_OPTIONS = [
  { value: "hot", label: "热门" },
  { value: "new", label: "最新" },
] as const;

export function InspirationCategoryNav({
  value,
  onChange,
  className,
}: InspirationCategoryNavProps) {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" });
        if (response.ok) {
          const json = await response.json();
          setCategories(json.items ?? []);
        }
      } catch (error) {
        console.error("Failed to load categories", error);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  // 当前选中的顶级/二级分类
  const activeTopCategory = categories.find((cat) => {
    if (cat.id === value.categoryId) return true;
    return cat.children.some((child) => child.id === value.categoryId);
  });

  const handleCategoryChange = useCallback(
    (id: string | null) => {
      onChange({ ...value, categoryId: id });
    },
    [onChange, value],
  );

  const handleTypeClick = useCallback(
    (type: string) => {
      // 全部：重置分类，仅切换内容类型
      if (type === "all") {
        onChange({ ...value, type, categoryId: null });
        return;
      }

      // 图片：如果存在二级分类，默认选中第一个二级分类
      if (type === "image") {
        let nextCategoryId = value.categoryId;
        const top = activeTopCategory ?? categories[0];
        if (top && top.children.length > 0) {
          nextCategoryId = top.children[0]?.id ?? null;
        }
        onChange({ ...value, type, categoryId: nextCategoryId ?? null });
        return;
      }

      // 视频：仅切换内容类型
      onChange({ ...value, type });
    },
    [onChange, value, activeTopCategory, categories],
  );

  const handleSortClick = useCallback(
    (sort: AssetSort) => {
      onChange({ ...value, sort });
    },
    [onChange, value],
  );

  if (loading) return null;

  const hasCategories = categories.length > 0;

  return (
    <section
      className={cn(
        "w-full rounded-2xl border border-border/80 bg-card/80 px-4 py-3 sm:px-6 lg:px-8",
        className,
      )}
    >
      {/* 顶部：内容类型 + 排序 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 顶部类型：只有 全部 / 图片 / 视频 */}
        <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-muted/70 p-1 text-[11px] md:text-xs">
          {TYPE_OPTIONS.map((option) => {
            const isActive = value.type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTypeClick(option.value)}
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

        {/* 排序：极简文本按钮 */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground md:text-xs">
          {SORT_OPTIONS.map((option) => {
            const isActive = value.sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSortClick(option.value)}
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

      {/* 二级分类：在主容器下方单独一行展示，仅在图片模式下显示 */}
      {value.type === "image" && activeTopCategory && activeTopCategory.children.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] md:text-xs">
          {activeTopCategory.children.map((child) => {
            const isChildActive = value.categoryId === child.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => handleCategoryChange(child.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  isChildActive
                    ? "bg-foreground/80 text-background shadow-sm"
                    : "text-muted-foreground/80 hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {child.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
