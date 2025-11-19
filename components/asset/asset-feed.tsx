"use client";


import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
  InspirationCategoryNav,
  InspirationFilterState
} from "@/components/asset/inspiration-category-nav";
import { AssetMasonry } from "@/components/asset/asset-masonry";
import { Button } from "@/components/ui/button";
import type { AssetListItem, AssetListResponse } from "@/lib/assets";
import { cn } from "@/lib/utils";

export type AssetFeedProps = {
  initialItems: AssetListItem[];
  initialCursor: string | null;
  initialState: InspirationFilterState;
  isAuthenticated?: boolean;
  userCredits?: number;
  basePath?: string; // 新增：用于更新 URL 时的基础路径（默认首页）
  compact?: boolean; // 紧凑模式，隐藏筛选栏和自动加载
  syncUrl?: boolean; // 是否将筛选状态同步到 URL（在 /studio 内应关闭）
};

const DEFAULT_STATE: InspirationFilterState = {
  type: "image",
  sort: "hot",
  categoryId: null,
};

export function AssetFeed({
  initialItems,
  initialCursor,
  initialState = DEFAULT_STATE,
  isAuthenticated,
  userCredits,
  basePath = "/",
  compact = false,
  syncUrl = true
}: AssetFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterState, setFilterState] = useState<InspirationFilterState>(initialState);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryKey = useMemo(
    () => ["assets", filterState.type, filterState.sort, filterState.categoryId],
    [filterState.type, filterState.sort, filterState.categoryId]
  );

  const fetchAssets = useCallback(
    async ({ pageParam }: { pageParam?: string | null }): Promise<AssetListResponse> => {
      const params = new URLSearchParams();
      params.set("type", filterState.type);
      params.set("sort", filterState.sort);
      if (filterState.categoryId) {
        params.set("categoryId", filterState.categoryId);
      }
      if (pageParam) {
        params.set("cursor", pageParam);
      }

      const response = await fetch(`/api/assets?${params.toString()}`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("获取作品列表失败");
      }

      return (await response.json()) as AssetListResponse;
    },
    [filterState]
  );

  const isInitialFilter =
    filterState.type === initialState.type &&
    filterState.sort === initialState.sort &&
    (filterState.categoryId ?? null) === (initialState.categoryId ?? null);

  const initialQueryData = useMemo(() => {
    if (!isInitialFilter) {
      return undefined;
    }
    return {
      pages: [
        {
          items: initialItems,
          nextCursor: initialCursor
        }
      ],
      pageParams: [null]
    } satisfies { pages: AssetListResponse[]; pageParams: (string | null)[] };
  }, [initialCursor, initialItems, isInitialFilter]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: fetchAssets,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
    initialData: initialQueryData
  });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [
    query.data
  ]);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    });

    observerRef.current.observe(sentinelRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [query]);

  useEffect(() => {
    if (query.isError) {
      const message = query.error instanceof Error ? query.error.message : "加载失败";
      toast.error(message);
    }
  }, [query.isError, query.error]);

  useEffect(() => {
    const typeParam = (searchParams.get("type") as string | "all" | null) ?? "all";
    const sortParam = (searchParams.get("sort") as "hot" | "new" | null) ?? "hot";
    const categoryParam = searchParams.get("categoryId");
    setFilterState({
      type: typeParam,
      sort: sortParam,
      categoryId: categoryParam
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUrl = useCallback(
    (state: InspirationFilterState) => {
      // 在某些嵌入场景（例如 Studio 的灵感画廊）不需要同步到 URL，避免在渲染期间触发 Router 更新告警
      if (!syncUrl) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("type", state.type);
      params.set("sort", state.sort);
      if (state.categoryId) {
        params.set("categoryId", state.categoryId);
      } else {
        params.delete("categoryId");
      }
      params.delete("cursor");
      router.replace(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath, syncUrl]
  );

  const handleFilterChange = useCallback(
    (state: InspirationFilterState) => {
      setFilterState(state);
      updateUrl(state);
    },
    [updateUrl]
  );



  const handleToggleFavorite = useCallback(
    async (assetId: string, nextState: boolean) => {
      const response = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ assetId, active: nextState })
      });

      if (!response.ok) {
        throw new Error("收藏操作失败");
      }

      toast.success(nextState ? "已收藏" : "已取消收藏");
    },
    []
  );

  const sentinelState = query.isFetchingNextPage
    ? "加载中..."
    : query.hasNextPage
      ? "继续下拉加载"
      : "已经到底啦";

  return (
    <div className="space-y-6">
      {!compact && (
        <>
          <InspirationCategoryNav value={filterState} onChange={handleFilterChange} />
        </>
      )}
      <AssetMasonry
        assets={items}
        onToggleFavorite={handleToggleFavorite}
        isAuthenticated={isAuthenticated}
        userCredits={userCredits}
        compact={compact}
      />
      {!compact && (
        <div className="flex flex-col items-center gap-3">
          {query.hasNextPage && (
            <Button
              variant="secondary"
              onClick={() => query.fetchNextPage()}
              loading={query.isFetchingNextPage}
              className="w-full max-w-xs"
            >
              加载更多
            </Button>
          )}
          <div
            ref={sentinelRef}
            className={cn(
              "text-center text-xs text-gray-500",
              query.isFetchingNextPage && "animate-pulse"
            )}
          >
            {sentinelState}
          </div>
        </div>
      )}
    </div>
  );
}
