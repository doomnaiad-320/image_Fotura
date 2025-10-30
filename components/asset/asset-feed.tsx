"use client";

import { AssetType } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type { AssetFilterState } from "@/components/asset/asset-filter-bar";
import { AssetFilterBar } from "@/components/asset/asset-filter-bar";
import { AssetMasonry } from "@/components/asset/asset-masonry";
import type { AssetListItem, AssetListResponse } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AssetFeedProps = {
  initialItems: AssetListItem[];
  initialCursor: string | null;
  initialState: AssetFilterState;
  isAuthenticated?: boolean;
  userCredits?: number;
  basePath?: string; // 新增：用于更新 URL 时的基础路径（默认首页）
};

const DEFAULT_STATE: AssetFilterState = {
  type: "all",
  sort: "hot"
};

export function AssetFeed({
  initialItems,
  initialCursor,
  initialState = DEFAULT_STATE,
  isAuthenticated,
  userCredits,
  basePath = "/"
}: AssetFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterState, setFilterState] = useState<AssetFilterState>(initialState);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryKey = useMemo(
    () => ["assets", filterState.type, filterState.sort],
    [filterState.type, filterState.sort]
  );

  const fetchAssets = useCallback(
    async ({ pageParam }: { pageParam?: string | null }): Promise<AssetListResponse> => {
      const params = new URLSearchParams();
      params.set("type", filterState.type);
      params.set("sort", filterState.sort);
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
    filterState.type === initialState.type && filterState.sort === initialState.sort;

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
    const typeParam = (searchParams.get("type") as AssetType | "all" | null) ?? "all";
    const sortParam = (searchParams.get("sort") as "hot" | "new" | null) ?? "hot";
    setFilterState({ type: typeParam, sort: sortParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUrl = useCallback(
    (state: AssetFilterState) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("type", state.type);
      params.set("sort", state.sort);
      params.delete("cursor");
      router.replace(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath]
  );

  const handleFilterChange = useCallback(
    (state: AssetFilterState) => {
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
      <AssetFilterBar value={filterState} onChange={handleFilterChange} />
      <AssetMasonry
        assets={items}
        onToggleFavorite={handleToggleFavorite}
        isAuthenticated={isAuthenticated}
        userCredits={userCredits}
      />
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
    </div>
  );
}
