"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

import type { AssetListItem } from "@/lib/assets";

export type PublishedGridProps = {
  initialItems: AssetListItem[];
  isAuthenticated: boolean;
};

export function PublishedGrid({ initialItems, isAuthenticated }: PublishedGridProps) {
  const [items, setItems] = useState<AssetListItem[]>(initialItems);

  const onDelete = useCallback(async (assetId: string) => {
    if (!isAuthenticated) return;
    if (!confirm("确认删除该作品？这将从公共列表中移除，但已购买/复用的用户仍可访问。")) return;

    const res = await fetch(`/api/assets/${assetId}/delete`, {
      method: "POST"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "删除失败");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== assetId));
    toast.success("已删除（软删除）");
  }, [isAuthenticated]);

  const memoItems = useMemo(() => items, [items]);

  if (memoItems.length === 0) {
    return (
      <div className="grid min-h-[200px] place-items-center rounded-3xl border border-dashed border-default py-12 text-muted-foreground">
        暂无已发布作品。
      </div>
    );
  }

  return (
    <ul className="divide-y divide-default rounded-2xl border border-default bg-surface">
      {memoItems.map((a) => (
        <li key={a.id} className="flex items-center gap-3 p-3">
          {/* 100x100 缩略图 */}
          <div className="relative h-[100px] w-[100px] overflow-hidden rounded-lg border border-default bg-surface-2 flex-shrink-0">
            {a.videoUrl ? (
              <video
                className="h-full w-full object-cover"
                poster={a.coverUrl}
                src={a.videoUrl ?? undefined}
                preload="metadata"
                muted
              />
            ) : (
              <Image
                src={a.coverUrl}
                alt={a.title}
                width={100}
                height={100}
                className="h-[100px] w-[100px] object-cover"
              />
            )}
          </div>

          {/* 信息与操作 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{a.modelTag}</div>
                <div className="text-xs text-muted-foreground mt-1">👍 {a.likes} · 👁️ {a.views}</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  className="rounded-xl border border-default bg-surface-2 px-3 py-2 text-center text-sm"
                  href={`/assets/${a.id}`}
                  target="_self"
                >
                  查看
                </a>
                <button
                  className="rounded-xl bg-red-600 text-white px-3 py-2 text-sm font-semibold hover:bg-red-500"
                  onClick={() => onDelete(a.id)}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
