"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CatNode = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  sort: number;
  children?: Array<{ id: string; name: string; slug: string; enabled: boolean; sort: number }>;
};

type ListResp = { items: CatNode[] };

export default function AdminCategoriesPage() {
  const { data, mutate, isLoading } = useSWR<ListResp>("/api/admin/categories", fetcher, { refreshInterval: 60_000 });
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CatNode | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function createCategory(payload: { name: string; parentId?: string | null; sort?: number }) {
    try {
      setBusy(true);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "创建失败");
      await mutate();
      setCreateOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  async function patchCategory(id: string, payload: any) {
    try {
      setBusy(true);
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "更新失败");
      await mutate();
      setEditOpen(false);
      setEditing(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "更新失败");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("确认删除该分类？若包含子分类或作品将无法删除")) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "删除失败");
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  const roots = data?.items ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">分类管理</h1>
        <p className="text-sm text-muted-foreground">配置两级分类（仅管理员可见）。用户发布作品时必须选择分类。</p>
      </header>

      {/* 工具栏 */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">共 {roots.length} 个根分类</div>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            onClick={() => { setCreateParentId(null); setCreateOpen(true); }}
          >新建根分类</button>
        </div>
      </div>

      {/* 列表表格 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">加载中...</div>
        ) : roots.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">暂无分类</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">排序</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">子分类</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roots.map((r) => {
                  const childCount = r.children?.length || 0;
                  return (
                    <>
                      <tr key={r.id} className="hover:bg-accent/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-foreground">{r.name}</div>
                              {childCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full border border-default text-muted-foreground">子类 {childCount}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
<span className={`text-xs px-2.5 py-0.5 rounded-full border ${r.enabled ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}>{r.enabled ? '启用' : '禁用'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{r.sort}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{childCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button className="px-3 py-1.5 rounded-lg bg-muted hover:bg-card text-sm" onClick={() => { setCreateParentId(r.id); setCreateOpen(true); }}>新建子类</button>
                            <button className="px-3 py-1.5 rounded-lg bg-muted hover:bg-card text-sm" onClick={() => { setEditing(r); setEditOpen(true); }}>编辑</button>
                            <button className={`${r.enabled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} px-3 py-1.5 rounded-lg text-white text-sm`} onClick={() => patchCategory(r.id, { enabled: !r.enabled })}>{r.enabled ? '禁用' : '启用'}</button>
                            <button className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm" onClick={() => deleteCategory(r.id)}>删除</button>
                          </div>
                        </td>
                      </tr>

                      {childCount > 0 && r.children!.map((c) => (
                        <tr key={c.id} className="bg-muted/10 hover:bg-accent/40">
                          <td className="px-4 py-3">
                            <div className="pl-8 border-l-2 border-accent/60">
                              <div className="font-medium text-foreground">{c.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
<span className={`text-xs px-2.5 py-0.5 rounded-full border ${c.enabled ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}>{c.enabled ? '启用' : '禁用'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{c.sort}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <button className="px-3 py-1.5 rounded-lg bg-muted hover:bg-card text-sm" onClick={() => { setEditing(c as any); setEditOpen(true); }}>编辑</button>
                              <button className={`${c.enabled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} px-3 py-1.5 rounded-lg text-white text-sm`} onClick={() => patchCategory(c.id, { enabled: !c.enabled })}>{c.enabled ? '禁用' : '启用'}</button>
                              <button className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm" onClick={() => deleteCategory(c.id)}>删除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 创建分类弹窗 */}
      {createOpen && (
        <CategoryDialog
          title={createParentId ? '新建子分类' : '新建根分类'}
          onClose={() => setCreateOpen(false)}
          onSubmit={(v) => createCategory({ ...v, parentId: createParentId })}
          loading={busy}
        />
      )}

      {/* 编辑分类弹窗 */}
      {editOpen && editing && (
        <CategoryDialog
          title="编辑分类"
          initial={{ name: editing.name, sort: editing.sort }}
          onClose={() => { setEditOpen(false); setEditing(null); }}
          onSubmit={(v) => patchCategory(editing.id, v)}
          loading={busy}
        />
      )}
    </div>
  );
}

function CategoryDialog({ title, initial, onClose, onSubmit, loading }: {
  title: string;
  initial?: { name: string; sort?: number };
  onClose: () => void;
  onSubmit: (v: { name: string; sort?: number }) => void;
  loading?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sort, setSort] = useState<number>(initial?.sort ?? 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
      <div className="w-full max-w-lg space-y-5 rounded-3xl border border-border bg-popover p-6">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">仅支持两级分类。slug 应为小写字母、数字和连字符。</p>
        </header>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSubmit({ name: name.trim(), sort });
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">名称</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="例如：摄影"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm text-muted-foreground">排序（数字越小越靠前）</label>
              <input
                type="number"
                value={sort}
                onChange={(e) => setSort(parseInt(e.target.value, 10) || 100)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 bg-muted hover:bg-card rounded-lg text-foreground">取消</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}
