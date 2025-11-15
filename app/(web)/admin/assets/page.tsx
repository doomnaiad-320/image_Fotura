"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { Search, ShieldBan, ShieldCheck, Pencil, Trash2, Loader2, Plus } from "lucide-react";

import type { AssetListItem } from "@/lib/assets";
import { EditAssetDialog } from "@/components/admin/edit-asset-dialog";
import { CreateAssetDialog } from "@/components/admin/create-asset-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AdminAsset = AssetListItem & {
  author?: { id: string; email: string; name: string | null } | null;
  isPublic: boolean;
  categoryId?: string | null;
};

type ListResponse = {
  items: AdminAsset[];
  nextCursor: string | null;
};

export default function AdminAssetsPage() {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<AdminAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminAsset | null>(null);
  const [creating, setCreating] = useState(false);

  const queryKey = useMemo(() => `/api/admin/assets?limit=50${q ? `&q=${encodeURIComponent(q)}` : ""}${cursor ? `&cursor=${cursor}` : ""}`, [q, cursor]);
  const { data, isLoading } = useSWR<ListResponse>(queryKey, fetcher, { refreshInterval: 60_000 });

  useEffect(() => {
    setLoading(isLoading);
    if (data && cursor) {
      setItems((prev) => [...prev, ...data.items]);
    } else if (data) {
      setItems(data.items);
    }
  }, [data, isLoading, cursor]);

  const hasNext = Boolean(data?.nextCursor);

  const reload = useCallback(() => {
    setCursor(null);
  }, []);

  const updateAsset = useCallback(async (id: string, patch: Partial<Pick<AdminAsset, "title" | "reusePoints">> & { isPublic?: boolean }) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`/api/admin/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "更新失败");
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e instanceof Error ? e.message : "更新失败");
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const toggleBlock = useCallback(async (id: string, isPublic: boolean) => {
    await updateAsset(id, { isPublic });
  }, [updateAsset]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("确认删除该作品？这将从公共列表中移除，但已购买/复用的用户仍可访问。")) return;
    const res = await fetch(`/api/assets/${id}/delete`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // eslint-disable-next-line no-alert
      alert(json.error || "删除失败");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">作品管理</h1>
          <p className="text-sm text-muted-foreground">管理首页瀑布流来源的公开作品：搜索、编辑、删除、屏蔽/解除屏蔽，以及调整复用积分。</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" /> 新增示例作品
        </button>
      </header>

      {/* 搜索栏 */}
      <div className="bg-card border border-border rounded-lg p-4">
        <form
          className="flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            reload();
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索标题、模型标签或作者邮箱..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">搜索</button>
        </form>
      </div>

      {/* 列表 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {!items || loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">暂无数据</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="p-4 grid grid-cols-[auto_1fr_auto] gap-4 items-center">
                {/* 缩略图 */}
                <div className="relative h-[80px] w-[80px] overflow-hidden rounded-lg border border-default bg-surface-2 flex-shrink-0">
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
                      width={80}
                      height={80}
                      className="h-[80px] w-[80px] object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a href={`/assets/${a.id}`} className="font-medium text-foreground hover:underline truncate" title={a.title}>{a.title}</a>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-default text-muted-foreground">{a.modelTag}</span>
                    {!a.isFavorited && !a.videoUrl && <span className="text-xs text-muted-foreground">{a.type}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${a.isPublic ? "border-green-800 text-green-400 bg-green-900/20" : "border-yellow-800 text-yellow-400 bg-yellow-900/20"}`}>
                      {a.isPublic ? "已公开" : "已屏蔽"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground truncate">
                    作者：{a.author?.name || a.author?.email || "系统"} · 👍 {a.likes} · 👁️ {a.views} · 热度 {a.hotScore}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <label className="text-muted-foreground">复用积分：</label>
                    <span className="px-2 py-1 rounded bg-muted inline-block">{a.reusePoints}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted hover:bg-card text-foreground text-sm"
                    title="编辑"
                    onClick={() => setEditing(a)}
                    disabled={updatingId === a.id}
                  >
                    <Pencil className="w-4 h-4" /> 编辑
                  </button>
                  <button
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${a.isPublic ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                    onClick={() => toggleBlock(a.id, !a.isPublic)}
                    disabled={updatingId === a.id}
                  >
                    {a.isPublic ? (<><ShieldBan className="w-4 h-4" /> 屏蔽</>) : (<><ShieldCheck className="w-4 h-4" /> 解除</>)}
                  </button>
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="w-4 h-4" /> 删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasNext && (
        <div className="flex justify-center">
          <button
            className="px-4 py-2 bg-muted hover:bg-card rounded-lg"
            onClick={() => setCursor(data?.nextCursor ?? null)}
          >
            加载更多
          </button>
        </div>
      )}
      {/* 编辑弹窗 */}
      <EditAssetDialog
        open={Boolean(editing)}
        asset={editing ? { id: editing.id, title: editing.title, isPublic: editing.isPublic, prompt: editing.prompt, categoryId: (editing as any).categoryId, reusePoints: editing.reusePoints } : null}
        onClose={() => setEditing(null)}
        onSaved={(patch) => {
          if (!editing) return;
          setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...patch } as any : it)));
          setEditing(null);
        }}
      />
      {/* 新增示例弹窗 */}
      <CreateAssetDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(asset) => {
          setItems((prev) => [asset as AdminAsset, ...prev]);
          setCreating(false);
        }}
      />
    </div>
  );
}
