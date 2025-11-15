"use client";

import React from "react";

type PublicCategory = { id: string; name: string; slug: string; children?: Array<{ id: string; name: string; slug: string }> };

type ModelOption = {
  slug: string;
  displayName: string;
  provider: { slug: string; name: string };
};

export type EditAsset = {
  id: string;
  title: string;
  isPublic: boolean;
  prompt?: string | null;
  categoryId?: string | null;
  reusePoints: number;
  model?: string | null;
};

export function EditAssetDialog({ open, asset, onClose, onSaved }: {
  open: boolean;
  asset: EditAsset | null;
  onClose: () => void;
  onSaved: (patch: Partial<EditAsset>) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const [reusePoints, setReusePoints] = React.useState<number>(50);
  const [categories, setCategories] = React.useState<PublicCategory[]>([]);
  const [rootId, setRootId] = React.useState<string>("");
  const [childId, setChildId] = React.useState<string>("");
  const [models, setModels] = React.useState<ModelOption[]>([]);
  const [modelSlug, setModelSlug] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && asset) {
      setTitle(asset.title);
      setIsPublic(asset.isPublic);
      setReusePoints(asset.reusePoints ?? 50);
      setModelSlug(asset.model || "");
      fetch('/api/categories')
        .then((r) => r.json())
        .then((json) => {
          const items = (json?.items || []) as PublicCategory[];
          setCategories(items);
          // 预选分类
          const all: Array<{ id: string; parentId?: string | null }> = [];
          items.forEach((r) => {
            all.push({ id: r.id, parentId: null });
            (r.children || []).forEach((c) => all.push({ id: c.id, parentId: r.id }));
          });
          const found = all.find((x) => x.id === asset.categoryId);
          if (found) {
            setRootId(found.parentId || found.id);
            if (found.parentId) setChildId(found.id); else setChildId("");
          } else if (items.length > 0) {
            setRootId(items[0].id);
            setChildId(items[0].children?.[0]?.id || "");
          }
        })
        .catch(() => {});

      // 拉取模型列表
      fetch('/api/ai/models')
        .then((r) => r.json())
        .then((json) => {
          const list = (json?.models || []) as any[];
          const opts: ModelOption[] = list.map((m) => ({
            slug: m.slug,
            displayName: m.displayName,
            provider: m.provider,
          }));
          setModels(opts);
        })
        .catch(() => {});
    }
  }, [open, asset]);

  if (!open || !asset) return null;

  const doSave = async () => {
    try {
      setSaving(true);
      const root = categories.find((c) => c.id === rootId);
      const child = root?.children?.find((c) => c.id === childId);
      const categoryId = (child?.id || root?.id || '').trim();
      const safePoints = Number.isNaN(Number(reusePoints)) ? asset.reusePoints : Math.max(0, Math.floor(reusePoints));
      const payload: any = { title: title.trim() || asset.title, isPublic, categoryId, reusePoints: safePoints, modelSlug: modelSlug || undefined };
      const res = await fetch(`/api/admin/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || '保存失败');
      onSaved({ title: payload.title, isPublic: payload.isPublic, categoryId: payload.categoryId, reusePoints: payload.reusePoints, model: modelSlug || asset.model });
      onClose();
    } catch (e: any) {
      alert(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-scrim">
      <div className="w-full sm:max-w-xl bg-popover rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold">编辑作品</h3>
          <button className="p-3 sm:p-2 rounded-lg hover:bg-accent" onClick={onClose} aria-label="关闭">
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium">标题</label>
            <input className="w-full rounded-xl border border-input bg-background px-4 py-3" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">分类</label>
            <div className="flex gap-2">
              <select className="flex-1 rounded-xl border border-input bg-background px-4 py-3" value={rootId} onChange={(e) => { const id = e.target.value; setRootId(id); const root = categories.find((c) => c.id === id); setChildId(root?.children?.[0]?.id || ''); }}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select className="flex-1 rounded-xl border border-input bg-background px-4 py-3" value={childId} onChange={(e) => setChildId(e.target.value)}>
                {(categories.find((c) => c.id === rootId)?.children || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
            <div>
              <p className="text-sm font-medium">公开显示</p>
              <p className="text-xs text-muted-foreground">关闭后将在前台隐藏</p>
            </div>
            <label className="inline-flex items-center gap-3">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-6 h-6 rounded-lg accent-orange-500" />
              <span className="text-sm">{isPublic ? '公开' : '屏蔽'}</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">模型</label>
            <select
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
              value={modelSlug}
              onChange={(e) => setModelSlug(e.target.value)}
            >
              <option value="">{models.length === 0 ? '暂无可用模型' : '请选择模型'}</option>
              {models.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.provider?.name ? `${m.provider.name} · ${m.displayName}` : m.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">应用所需积分</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0}
                max={10000}
                step={10}
                className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="设置为 0 表示免费应用"
                value={reusePoints}
                onChange={(e) => setReusePoints(Math.max(0, Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)))}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">积分</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">提示词</label>
            <div className="text-sm text-foreground bg-muted rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
              {asset.prompt || '无'}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-border">
          <button onClick={onClose} disabled={saving} className="flex-1 min-h-[44px] rounded-xl border border-input bg-muted text-foreground">取消</button>
          <button onClick={doSave} disabled={saving} className="flex-1 min-h-[44px] rounded-xl bg-blue-600 text-white hover:bg-blue-700">保存</button>
        </div>
      </div>
    </div>
  );
}