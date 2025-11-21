"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AssetSort } from "@/lib/assets";
import { cn } from "@/lib/utils";

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

  const imageRoot = useMemo(
    () => categories.find((cat) => cat.slug === "image") ?? null,
    [categories],
  );

  const handleCategoryChange = useCallback(
    (id: string | null) => {
      onChange({ ...value, categoryId: id });
    },
    [onChange, value],
  );

  const handleTypeClick = useCallback(
    (type: string) => {
      if (type === "all") {
        // 在“全部”模式下也支持二级分类筛选，所以不再强制清空 categoryId
        onChange({ ...value, type });
        return;
      }

      if (type === "image") {
        const root = imageRoot ?? categories[0] ?? null;
        const hasExisting = Boolean(
          value.categoryId && root?.children?.some((child) => child.id === value.categoryId),
        );
        const nextCategoryId = hasExisting ? value.categoryId : root?.children?.[0]?.id ?? null;
        onChange({ ...value, type, categoryId: nextCategoryId });
        return;
      }

      if (type === "video") {
        onChange({ ...value, type });
        return;
      }

      onChange({ ...value, type });
    },
    [categories, imageRoot, onChange, value],
  );

  const handleSortClick = useCallback(
    (sort: AssetSort) => {
      onChange({ ...value, sort });
    },
    [onChange, value],
  );

  // 当类型切到图片时，如果没有选中的二级分类，默认选中 imageRoot 的第一个子类
  useEffect(() => {
    if (loading) return;
    if (value.type !== "image") return;
    if (!imageRoot || !imageRoot.children.length) return;

    const belongsToImage = value.categoryId
      ? imageRoot.children.some((child) => child.id === value.categoryId)
      : false;
    if (belongsToImage) return;

    const fallbackChild = imageRoot.children[0]?.id ?? null;
    if (!fallbackChild) return;

    onChange({
      type: "image",
      sort: value.sort,
      categoryId: fallbackChild,
    });
  }, [imageRoot, loading, onChange, value.categoryId, value.sort, value.type]);

  if (loading) return null;

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

      {/* 二级分类：在“全部”和“图片”模式下展示，直接基于 imageRoot */}
      {(value.type === "image" || value.type === "all") &&
        imageRoot &&
        imageRoot.children.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] md:text-xs">
          {imageRoot.children.map((child) => {
            const isChildActive = value.categoryId === child.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => handleCategoryChange(child.id)}
                className={cn(
                  "focus-visible:ring-foreground/40 rounded-full border px-3 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  isChildActive
                    ? "border-foreground bg-foreground text-background shadow-sm"
                    : "hover:border-foreground/50 border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:bg-surface-2 dark:hover:bg-surface",
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
