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
  Sparkles,
  Search,
  Filter,
  List,
  Grid3X3,
  Copy,
  MoreHorizontal,
  Download
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

const VIEW_TABS: { key: ViewKey; label: string; desc: string; icon: any }[] = [
  { key: "mine", label: "我的素材", desc: "管理私有与公开素材", icon: LayoutGrid },
  { key: "favorites", label: "收藏夹", desc: "快速回访收藏内容", icon: Star },
  { key: "public", label: "公共素材", desc: "探索社区最新作品", icon: Globe }
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
  
  // Toolbar states
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [modelFilter, setModelFilter] = useState<string>("all");
  
  const { data, error, isLoading, mutate } = useSWR<{ items: AssetItem[] }>(
    `/api/me/assets?view=${activeView}`,
    fetcher
  );
  const items = data?.items ?? [];

  // Filter items
  const filteredItems = useMemo(() => {
    let res = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.prompt.toLowerCase().includes(q)
      );
    }
    if (modelFilter !== "all") {
      res = res.filter(i => i.modelSlug === modelFilter);
    }
    return res;
  }, [items, searchQuery, modelFilter]);

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

  const handleCopyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt 已复制");
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Left Sidebar - Navigation Tree */}
      <aside className="w-64 shrink-0 border-r border-border bg-surface/50 hidden md:flex md:flex-col">
        <div className="p-6">
          <h2 className="px-2 text-lg font-semibold tracking-tight text-foreground mb-6">素材管理</h2>
          <nav className="space-y-1">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeView === tab.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-border">
           <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-4">
             <h3 className="text-sm font-semibold text-foreground mb-1">当前积分</h3>
             <p className="text-2xl font-bold text-primary">{user.credits}</p>
             <p className="text-xs text-muted-foreground mt-2">创建或公开素材可能会获得奖励</p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Toolbar */}
        <header className="h-16 shrink-0 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
             {/* Search */}
             <div className="relative w-full max-w-sm">
               <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <input
                 className="h-9 w-full rounded-md border border-input bg-surface px-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                 placeholder="搜索标题或 Prompt..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             
             {/* Filters */}
             <div className="flex items-center gap-2">
                <div className="relative">
                  <select 
                    className="h-9 rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value)}
                  >
                    <option value="all">所有模型</option>
                    {selectableModels.map(m => (
                      <option key={m.slug} value={m.slug}>{m.displayName}</option>
                    ))}
                  </select>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
             <div className="flex items-center rounded-md border border-input p-1 bg-surface">
               <button
                 onClick={() => setViewMode("grid")}
                 className={cn(
                   "rounded-sm p-1.5 transition-colors",
                   viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 <Grid3X3 className="h-4 w-4" />
               </button>
               <button
                 onClick={() => setViewMode("list")}
                 className={cn(
                   "rounded-sm p-1.5 transition-colors",
                   viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 <List className="h-4 w-4" />
               </button>
             </div>
             
             <div className="h-6 w-px bg-border mx-2" />
             
             <button
                onClick={() => openEditor()}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                新建
              </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive mb-6">
              加载失败：{error.message}
            </div>
          )}

          {isLoading ? (
             <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="break-inside-avoid space-y-2 rounded-xl border border-border p-2">
                  <div className="h-48 rounded-lg bg-muted animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
               <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
                 <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
               </div>
               <h3 className="text-lg font-semibold text-foreground">暂无内容</h3>
               <p className="text-muted-foreground max-w-sm mt-2 text-sm">
                  {searchQuery 
                    ? "没有找到匹配的素材，换个关键词试试？" 
                    : "这里还是一片荒原，去创造一些精彩的素材吧。"}
               </p>
               {activeView === "mine" && !searchQuery && (
                 <button
                   onClick={() => openEditor()}
                   className="mt-6 text-primary hover:underline text-sm font-medium"
                 >
                   创建第一个素材
                 </button>
               )}
            </div>
          ) : viewMode === "grid" ? (
             // Masonry Grid Layout
             <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 pb-10">
               {filteredItems.map((item) => (
                 <div key={item.id} className="break-inside-avoid">
                   <AssetMasonryCard
                     asset={item}
                     viewerId={user.id}
                     onEdit={() => openEditor(item)}
                     onDelete={() => handleDelete(item)}
                     onFavorite={() => handleFavoriteToggle(item)}
                     onReuse={() => handleReuse(item)}
                     onCopy={() => handleCopyPrompt(item.prompt)}
                   />
                 </div>
               ))}
             </div>
          ) : (
             // List View Layout
             <div className="rounded-lg border border-border overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-muted/50 text-muted-foreground font-medium">
                   <tr>
                     <th className="px-4 py-3">预览</th>
                     <th className="px-4 py-3">标题 / Prompt</th>
                     <th className="px-4 py-3">模型</th>
                     <th className="px-4 py-3">尺寸</th>
                     <th className="px-4 py-3 text-right">操作</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                   {filteredItems.map(item => (
                     <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                       <td className="px-4 py-3 w-16">
                         <div className="h-12 w-12 rounded-md overflow-hidden bg-muted">
                           <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                         </div>
                       </td>
                       <td className="px-4 py-3 max-w-md">
                         <div className="font-medium text-foreground truncate">{item.title}</div>
                         <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.prompt}</div>
                       </td>
                       <td className="px-4 py-3 text-muted-foreground">{item.modelName}</td>
                       <td className="px-4 py-3 text-muted-foreground">{item.size}</td>
                       <td className="px-4 py-3 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleReuse(item)} title="复用" className="p-1.5 hover:bg-muted rounded-md text-foreground">
                              <Sparkles className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleCopyPrompt(item.prompt)} title="复制 Prompt" className="p-1.5 hover:bg-muted rounded-md text-foreground">
                              <Copy className="h-4 w-4" />
                            </button>
                            <button onClick={() => openEditor(item)} title="编辑" className="p-1.5 hover:bg-muted rounded-md text-foreground">
                              <Edit2 className="h-4 w-4" />
                            </button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          )}
        </div>
      </main>

      {/* Right Drawer Editor */}
      {editorOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity" 
            onClick={closeEditor}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-border bg-background shadow-2xl transition-transform duration-300 sm:duration-500 animate-in slide-in-from-right">
             <div className="flex h-full flex-col">
               {/* Drawer Header */}
               <div className="flex items-center justify-between border-b border-border px-6 py-4">
                 <div>
                   <h2 className="text-lg font-semibold text-foreground">
                     {draft.id ? "编辑素材" : "新建素材"}
                   </h2>
                   <p className="text-sm text-muted-foreground">
                     {draft.id ? "更新你的素材信息" : "创建并配置你的 AI 创作素材"}
                   </p>
                 </div>
                 <button
                   onClick={closeEditor}
                   className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                 >
                   <X className="h-5 w-5" />
                 </button>
               </div>

               {/* Drawer Content */}
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Image Preview Area */}
                  <div className="group relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                    {(previewUrl || draft.coverUrl) ? (
                      <img
                        src={previewUrl || draft.coverUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                        <span className="text-xs">暂无图片</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <label className="cursor-pointer rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20">
                         更改图片
                         <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>
                  
                  {/* Input Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">标题</label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="给素材起个好听的名字"
                        value={draft.title}
                        onChange={(e) => setDraft(p => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Prompt 提示词</label>
                      <textarea
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        placeholder="输入详细的画面描述..."
                        value={draft.prompt}
                        onChange={(e) => setDraft(p => ({ ...p, prompt: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">模型</label>
                        <select
                          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          value={draft.modelSlug}
                          onChange={(e) => {
                             const slug = e.target.value;
                             const m = selectableModels.find(x => x.slug === slug);
                             setDraft(p => ({ ...p, modelSlug: slug, modelName: m?.displayName ?? slug }));
                          }}
                        >
                          {selectableModels.map(m => (
                            <option key={m.slug} value={m.slug}>{m.displayName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">尺寸</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={draft.size}
                          onChange={(e) => setDraft(p => ({ ...p, size: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">外部图片链接 (可选)</label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="https://..."
                        value={draft.coverUrl}
                        onChange={(e) => setDraft(p => ({ ...p, coverUrl: e.target.value, file: null }))}
                      />
                    </div>
                    
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-sm font-medium text-foreground">公开到社区</label>
                          <p className="text-xs text-muted-foreground">允许其他用户复用此 Prompt</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-primary text-primary focus:ring-primary"
                          checked={draft.isPublic}
                          onChange={(e) => setDraft(p => ({ ...p, isPublic: e.target.checked }))}
                        />
                      </div>
                      {draft.isPublic && (
                         <div className="flex items-center gap-3 border-t border-border/50 pt-3">
                           <span className="text-sm text-muted-foreground">设置复用价格</span>
                           <input
                             type="number"
                             className="w-20 h-8 rounded-md border border-input px-2 text-sm text-right"
                             value={draft.shareCost}
                             onChange={(e) => setDraft(p => ({ ...p, shareCost: Number(e.target.value) }))}
                           />
                           <span className="text-sm text-muted-foreground">积分</span>
                         </div>
                      )}
                    </div>
                  </div>
               </div>
               
               {/* Drawer Footer */}
               <div className="border-t border-border px-6 py-4 bg-background">
                 <div className="flex justify-end gap-3">
                   <button
                     onClick={closeEditor}
                     className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                   >
                     取消
                   </button>
                   <button
                     onClick={handleSave}
                     disabled={saving}
                     className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                   >
                     {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     保存
                   </button>
                 </div>
               </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}

// Masonry Card Component with Hover Interactions
function AssetMasonryCard({ 
  asset, 
  viewerId, 
  onEdit, 
  onDelete, 
  onFavorite, 
  onReuse,
  onCopy 
}: { 
  asset: AssetItem; 
  viewerId: string;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onReuse: () => void;
  onCopy: () => void;
}) {
  const isOwner = asset.ownerId === viewerId;
  
  return (
    <div className="group relative break-inside-avoid rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Image & Hover Overlay */}
      <div className="relative overflow-hidden">
        <img 
          src={asset.coverUrl} 
          alt={asset.title} 
          className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        {/* Public Badge */}
        {asset.isPublic && (
          <div className="absolute top-2 left-2 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
            {asset.shareCost > 0 ? `${asset.shareCost} 积分` : "公开"}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
           {/* Top Actions */}
           <div className="flex justify-end gap-2 translate-y-[-10px] group-hover:translate-y-0 transition-transform duration-300">
             <button 
               onClick={onFavorite}
               className={cn(
                 "h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors",
                 asset.isFavorited && "text-yellow-400 bg-white/30"
               )}
             >
               <Star className={cn("h-4 w-4", asset.isFavorited && "fill-current")} />
             </button>
             {isOwner && (
               <button 
                 onClick={onDelete}
                 className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500/60 transition-colors"
               >
                 <Trash2 className="h-4 w-4" />
               </button>
             )}
           </div>

           {/* Bottom Actions & Prompt Preview */}
           <div className="translate-y-[10px] group-hover:translate-y-0 transition-transform duration-300">
             <div className="text-xs text-white/90 line-clamp-3 mb-3 font-light drop-shadow-md">
               {asset.prompt}
             </div>
             <button 
               onClick={onReuse}
               className="w-full rounded-lg bg-primary/90 hover:bg-primary backdrop-blur-sm py-2 text-xs font-semibold text-primary-foreground flex items-center justify-center gap-2 transition-colors shadow-lg"
             >
               <Sparkles className="h-3.5 w-3.5" />
               立即复用
             </button>
           </div>
        </div>
      </div>

      {/* Card Meta Info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-medium text-foreground text-sm truncate pr-2" title={asset.title}>{asset.title}</h3>
          <button 
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            title="复制 Prompt"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="bg-secondary px-1.5 py-0.5 rounded">{asset.modelName}</span>
          <span>{asset.size}</span>
        </div>
      </div>
    </div>
  );
}
