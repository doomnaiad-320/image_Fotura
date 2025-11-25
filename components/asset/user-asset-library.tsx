"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { 
  LayoutGrid, 
  Star, 
  Globe, 
  Plus, 
  Trash2, 
  Edit2, 
  Image as ImageIcon,
  Loader2,
  X,
  Sparkles
} from "lucide-react";

import type { ModelOption } from "@/components/ai/playground";
import { cn } from "@/lib/utils";

type ViewKey = "mine" | "favorites" | "public";

type PrefillPayload = {
  prompt: string;
  modelSlug: string;
  modelName: string;
  size: string;
  mode: string;
  coverUrl: string;
  aspectRatio: number;
} | null;

type AssetItem = {
  id: string;
  title: string;
  prompt: string;
  modelSlug: string;
  modelName: string;
  size: string;
  mode: string;
  coverUrl: string;
  aspectRatio: number;
  isPublic: boolean;
  shareCost: number;
  createdAt: string;
  updatedAt: string;
  isFavorited: boolean;
  reuseCount: number;
  ownerId?: string | null;
  reusedAt?: string | null;
  prefill: PrefillPayload;
};

type DraftState = {
  id: string | null;
  title: string;
  prompt: string;
  modelSlug: string;
  modelName: string;
  coverUrl: string;
  file: File | null;
  isPublic: boolean;
  shareCost: number;
  size: string;
  mode: string;
  aspectRatio: number;
};

const VIEW_TABS: { key: ViewKey; label: string; icon: any }[] = [
  { key: "mine", label: "我的素材", icon: LayoutGrid },
  { key: "favorites", label: "收藏夹", icon: Star },
  { key: "public", label: "公共素材", icon: Globe }
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "请求失败");
  }
  return res.json();
};

const emptyDraft = (model?: ModelOption): DraftState => ({
  id: null,
  title: "",
  prompt: "",
  modelSlug: model?.slug ?? "",
  modelName: model?.displayName ?? "",
  coverUrl: "",
  file: null,
  isPublic: false,
  shareCost: 0,
  size: "1024x1024",
  mode: "txt2img",
  aspectRatio: 1
});

function usePreviewUrl() {
  const [preview, setPreview] = useState<string | null>(null);

  const assign = useCallback((file: File | null) => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  return { previewUrl: preview, setPreviewFile: assign };
}

type Props = {
  models: ModelOption[];
  user: { id: string; credits: number };
};

export default function UserAssetLibrary({ models, user }: Props) {
  const selectableModels = useMemo(
    () => models.filter((model) => !model.isPromptOptimizer),
    [models]
  );
  const [activeView, setActiveView] = useState<ViewKey>("mine");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => emptyDraft(selectableModels[0]));
  const { previewUrl, setPreviewFile } = usePreviewUrl();
  const [saving, setSaving] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{ items: AssetItem[] }>(
    `/api/me/assets?view=${activeView}`,
    fetcher
  );
  const items = data?.items ?? [];

  const openEditor = useCallback(
    (asset?: AssetItem) => {
      if (asset) {
        setDraft({
          id: asset.id,
          title: asset.title,
          prompt: asset.prompt,
          modelSlug: asset.modelSlug,
          modelName: asset.modelName,
          coverUrl: asset.coverUrl,
          file: null,
          isPublic: asset.isPublic,
          shareCost: asset.shareCost,
          size: asset.size,
          mode: asset.mode,
          aspectRatio: asset.aspectRatio
        });
        setPreviewFile(null);
      } else {
        setDraft(emptyDraft(selectableModels[0]));
        setPreviewFile(null);
      }
      setEditorOpen(true);
    },
    [selectableModels, setPreviewFile]
  );

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setDraft(emptyDraft(selectableModels[0]));
    setPreviewFile(null);
  }, [selectableModels, setPreviewFile]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0] ?? null;
    setDraft((prev) => ({
      ...prev,
      file,
      coverUrl: file ? "" : prev.coverUrl
    }));
    setPreviewFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          if (img.width && img.height) {
            setDraft((prev) => ({
              ...prev,
              aspectRatio: Number((img.width / img.height).toFixed(3))
            }));
          }
        };
        img.src = (ev.target?.result as string) ?? "";
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || "图片上传失败");
    }
    return json.url as string;
  }, []);

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const handleSave = useCallback(async () => {
    if (!draft.title.trim()) {
      toast.error("请输入素材标题");
      return;
    }
    if (!draft.prompt.trim()) {
      toast.error("请输入 Prompt");
      return;
    }
    if (!draft.modelSlug) {
      toast.error("请选择模型");
      return;
    }
    if (!draft.coverUrl && !draft.file) {
      toast.error("请上传或填写示例图");
      return;
    }

    try {
      setSaving(true);
      let coverUrl = draft.coverUrl.trim();
      if (draft.file) {
        toast.loading("正在上传图片...");
        coverUrl = await uploadImage(draft.file);
        toast.dismiss();
      }

      const payload = {
        title: draft.title.trim(),
        prompt: draft.prompt.trim(),
        modelSlug: draft.modelSlug,
        modelName: draft.modelName || selectableModels.find((m) => m.slug === draft.modelSlug)?.displayName,
        coverUrl,
        isPublic: draft.isPublic,
        shareCost: draft.isPublic ? draft.shareCost : 0,
        size: draft.size,
        mode: draft.mode,
        aspectRatio: draft.aspectRatio
      };

      const res = await fetch(draft.id ? `/api/me/assets/${draft.id}` : "/api/me/assets", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "保存失败");
      }

      toast.success(draft.id ? "素材已更新" : "素材已创建");
      closeEditor();
      await refresh();
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [draft, selectableModels, uploadImage, closeEditor, refresh]);

  const handleDelete = useCallback(
    async (asset: AssetItem) => {
      if (!confirm(`确定删除「${asset.title}」吗？`)) return;
      try {
        const res = await fetch(`/api/me/assets/${asset.id}`, { method: "DELETE" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "删除失败");
        toast.success("素材已删除");
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "删除失败");
      }
    },
    [refresh]
  );

  const handleFavoriteToggle = useCallback(
    async (asset: AssetItem) => {
      try {
        const res = await fetch("/api/favorites/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: asset.id, active: !asset.isFavorited })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "操作失败");
        toast.success(!asset.isFavorited ? "已收藏" : "已取消收藏");
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "操作失败");
      }
    },
    [refresh]
  );

  const handleReuse = useCallback((asset: AssetItem) => {
    if (!asset.prefill) {
      toast.error("素材缺少复用数据");
      return;
    }
    localStorage.setItem(
      "reuse_prefill_data",
      JSON.stringify({
        prompt: asset.prefill.prompt,
        modelSlug: asset.prefill.modelSlug,
        assetId: asset.id,
        assetTitle: asset.title,
        coverUrl: asset.prefill.coverUrl,
        size: asset.prefill.size,
        timestamp: Date.now()
      })
    );
    toast.success("已注入工作室，准备跳转");
    window.location.href = "/studio";
  }, []);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">素材库</h1>
          <p className="mt-2 text-muted-foreground">
            管理与分享你的 Prompt 素材，激发创作灵感。
          </p>
        </div>
        <button
          onClick={() => openEditor()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="mr-2 h-4 w-4" />
          新建素材
        </button>
      </div>

      <div className="mb-8 border-b border-border">
        <div className="flex gap-6">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                activeView === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          加载失败：{error.message}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-56 rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">暂无素材</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            {activeView === "favorites"
              ? "你还没有收藏任何素材。"
              : activeView === "public"
              ? "社区暂时没有公开素材。"
              : "你还没有创建任何素材，开始你的创作之旅吧。"}
          </p>
          {activeView === "mine" && (
            <button
              onClick={() => openEditor()}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              开始创建
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <AssetCard
              key={item.id}
              asset={item}
              viewerId={user.id}
              onEdit={() => openEditor(item)}
              onDelete={() => handleDelete(item)}
              onFavorite={() => handleFavoriteToggle(item)}
              onReuse={() => handleReuse(item)}
            />
          ))}
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border p-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {draft.id ? "编辑素材" : "新建素材"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {draft.id ? "更新你的素材信息" : "创建一个新的创作素材"}
                </p>
              </div>
              <button
                onClick={closeEditor}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">素材标题</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="给素材起个好听的名字"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Prompt 提示词</label>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  value={draft.prompt}
                  onChange={(e) => setDraft((prev) => ({ ...prev, prompt: e.target.value }))}
                  placeholder="输入详细的画面描述..."
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">选择模型</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={draft.modelSlug}
                    onChange={(e) => {
                      const slug = e.target.value;
                      const model = selectableModels.find((m) => m.slug === slug);
                      setDraft((prev) => ({
                        ...prev,
                        modelSlug: slug,
                        modelName: model?.displayName ?? slug
                      }));
                    }}
                  >
                    <option value="" disabled>请选择模型</option>
                    {selectableModels.map((model) => (
                      <option key={model.slug} value={model.slug}>
                        {model.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">输出尺寸</label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={draft.size}
                    onChange={(e) => setDraft((prev) => ({ ...prev, size: e.target.value }))}
                    placeholder="例如: 1024x1024"
                  />
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <label className="text-sm font-medium text-foreground">示例图片</label>
                   <label className="cursor-pointer text-sm text-primary hover:underline">
                     <span>点击上传图片</span>
                     <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                     />
                   </label>
                 </div>
                 
                 {(previewUrl || draft.coverUrl) ? (
                   <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                     <img
                        src={previewUrl || draft.coverUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                     />
                     <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                   </div>
                 ) : (
                   <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-dashed border-input bg-muted/50 text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-xs">暂无图片，请上传或输入链接</span>
                   </div>
                 )}
                 
                 <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={draft.coverUrl}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        coverUrl: e.target.value,
                        file: e.target.value ? null : prev.file
                      }))
                    }
                    placeholder="或输入图片 URL..."
                  />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-5 items-center">
                    <input
                      id="isPublic"
                      type="checkbox"
                      className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                      checked={draft.isPublic}
                      onChange={(e) => setDraft((prev) => ({ ...prev, isPublic: e.target.checked }))}
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="isPublic" className="text-sm font-medium text-foreground">
                      公开到社区
                    </label>
                    <p className="text-xs text-muted-foreground">
                      公开素材后，其他用户可以使用你的 Prompt。
                    </p>
                  </div>
                </div>
                {draft.isPublic && (
                  <div className="mt-3 flex items-center gap-3 pl-7">
                    <span className="text-sm text-muted-foreground">复用价格:</span>
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={draft.shareCost}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, shareCost: Number(e.target.value) }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">积分</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeEditor}
                  disabled={saving}
                  className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saving ? "保存中..." : "保存素材"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type AssetCardProps = {
  asset: AssetItem;
  viewerId: string;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onReuse: () => void;
};

function AssetCard({ asset, viewerId, onEdit, onDelete, onFavorite, onReuse }: AssetCardProps) {
  const isOwner = asset.ownerId === viewerId;
  const createdAt = new Date(asset.createdAt);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <img
          src={asset.coverUrl}
          alt={asset.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {asset.isPublic && (
          <div className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white">
            {asset.shareCost > 0 ? `${asset.shareCost} 积分` : "免费"}
          </div>
        )}
      </div>
      
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
           <h3 className="font-semibold text-foreground line-clamp-1" title={asset.title}>
             {asset.title}
           </h3>
        </div>
        
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
            {asset.modelName}
          </span>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
             {asset.size}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
           <button 
             onClick={onReuse}
             className="flex-1 inline-flex items-center justify-center rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
           >
             <Sparkles className="mr-1.5 h-4 w-4" />
             复用
           </button>
           
           <div className="flex gap-1">
             <button
               onClick={onFavorite}
               className={cn(
                 "inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                 asset.isFavorited && "text-amber-400 hover:text-amber-500"
               )}
               title={asset.isFavorited ? "取消收藏" : "收藏"}
             >
               <Star className={cn("h-4 w-4", asset.isFavorited && "fill-current")} />
             </button>
             
             {isOwner && (
               <>
                 <button
                   onClick={onEdit}
                   className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                   title="编辑"
                 >
                   <Edit2 className="h-4 w-4" />
                 </button>
                 <button
                   onClick={onDelete}
                   className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                   title="删除"
                 >
                   <Trash2 className="h-4 w-4" />
                 </button>
               </>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
