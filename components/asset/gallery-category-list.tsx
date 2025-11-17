"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

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

type GalleryCategoryListProps = {
  value?: string | null;
  onChange?: (categoryId: string | null) => void;
};

export function GalleryCategoryList({ value = null, onChange }: GalleryCategoryListProps) {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("分类加载失败");
      }
      const json = (await response.json()) as { items?: PublicCategory[] };
      setCategories(json.items ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "分类加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-default bg-surface px-4 py-5">
        <div className="text-sm text-muted-foreground">正在加载全部分类...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/50 bg-destructive/5 px-4 py-5 text-sm text-destructive">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadCategories}
            className="rounded-full border border-destructive bg-transparent px-3 py-1 text-xs font-medium transition hover:bg-destructive hover:text-destructive-foreground"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-default bg-surface px-4 py-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">灵感分类</p>
          <p className="text-xs text-muted-foreground">浏览所有一级和二级创作方向</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>共 {categories.length} 个一级分类</span>
          {value && (
            <button
              type="button"
              onClick={() => onChange?.(null)}
              className="rounded-full border border-border bg-transparent px-3 py-1 text-[11px] text-foreground transition hover:bg-foreground hover:text-background"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <article
            key={category.id}
            className="rounded-2xl border border-border/80 bg-muted/30 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{category.name}</h3>
              {category.children.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {category.children.length} 个子类
                </span>
              )}
            </div>
            {category.children.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {category.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    aria-pressed={value === child.id}
                    onClick={() => {
                      const nextValue = value === child.id ? null : child.id;
                      onChange?.(nextValue);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      value === child.id
                        ? "border-foreground bg-foreground text-background"
                        : "hover:border-foreground/60 border-border/70 bg-background text-muted-foreground"
                    )}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">暂无二级分类</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
