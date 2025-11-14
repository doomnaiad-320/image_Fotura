"use client";

import React from "react";
import toast from "react-hot-toast";

type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  children?: Array<{ id: string; name: string; slug: string }>;
};

export type CreateAssetDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (asset: any) => void;
};

export function CreateAssetDialog({ open, onClose, onCreated }: CreateAssetDialogProps) {
  const [title, setTitle] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const [categories, setCategories] = React.useState<PublicCategory[]>([]);
  const [rootId, setRootId] = React.useState<string>("");
  const [childId, setChildId] = React.useState<string>("");
  const [coverUrl, setCoverUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // 重置表单
      setTitle("");
      setPrompt("");
      setIsPublic(true);
      setCoverUrl("");
      setFile(null);
      setSaving(false);

      // 拉取分类
      fetch("/api/categories")
        .then((r) => r.json())
        .then((json) => {
          const items = (json?.items || []) as PublicCategory[];
          setCategories(items);
          if (items.length > 0) {
            setRootId(items[0].id);
            setChildId(items[0].children?.[0]?.id || "");
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    // 如果选择了文件，就不再使用手动链接
    if (f) {
      setCoverUrl("");
    }
  };

  const uploadFileToR2 = async (f: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", f);

    const resp = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
    });

    const text = await resp.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // ignore
    }

    if (!resp.ok) {
      const msg = data?.error || data?.message || `上传失败（${resp.status}）`;
      throw new Error(msg);
    }

    const url = data?.url as string | undefined;
    if (!url) throw new Error("上传返回无效");
    return url;
  };

  const doSave = async () => {
    if (!title.trim()) {
      toast.error("请输入标题");
      return;
    }

    if (!rootId) {
      toast.error("请先配置分类");
      return;
    }

    if (!coverUrl && !file) {
      toast.error("请提供图片链接或上传图片");
      return;
    }

    try {
      setSaving(true);

      let finalCoverUrl = coverUrl.trim();

      if (file) {
        toast.loading("正在上传图片到云存储...");
        finalCoverUrl = await uploadFileToR2(file);
        toast.dismiss();
        toast.success("图片上传成功");
      }

      if (!finalCoverUrl) {
        toast.error("图片地址无效");
        return;
      }

      const root = categories.find((c) => c.id === rootId);
      const child = root?.children?.find((c) => c.id === childId);
      const categoryId = (child?.id || root?.id || "").trim();
      if (!categoryId) {
        toast.error("请选择分类");
        return;
      }

      const payload = {
        title: title.trim(),
        categoryId,
        prompt: prompt.trim() || undefined,
        coverUrl: finalCoverUrl,
        isPublic,
      };

      const res = await fetch("/api/admin/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "创建失败");
      }

      const item = json.item ?? json.data ?? null;
      if (!item) {
        throw new Error("创建成功但返回数据无效");
      }

      toast.success("创建成功");
      onCreated(item);
    } catch (e: any) {
      toast.dismiss();
      console.error(e);
      toast.error(e?.message || "创建失败");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-scrim">
      <div className="w-full sm:max-w-xl bg-popover rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold">新增示例作品</h3>
          <button className="p-3 sm:p-2 rounded-lg hover:bg-accent" onClick={onClose} aria-label="关闭">
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium">标题</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入作品标题"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">分类</label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-xl border border-input bg-background px-4 py-3"
                value={rootId}
                onChange={(e) => {
                  const id = e.target.value;
                  setRootId(id);
                  const root = categories.find((c) => c.id === id);
                  setChildId(root?.children?.[0]?.id || "");
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="flex-1 rounded-xl border border-input bg-background px-4 py-3"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
              >
                {(categories.find((c) => c.id === rootId)?.children || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">提示词</label>
            <textarea
              className="w-full rounded-xl border border-input bg-background px-4 py-3 min-h-[80px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="可选，用于复用时自动填充 Prompt"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">图片链接</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://...，如果上方选择了文件，这里会被忽略"
              disabled={!!file}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">或上传图片</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-semibold file:text-foreground hover:file:bg-accent"
            />
            <p className="text-xs text-muted-foreground">如果上传图片，将自动上传到云存储并使用返回的链接。</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
            <div>
              <p className="text-sm font-medium">公开显示</p>
              <p className="text-xs text-muted-foreground">关闭后将在前台隐藏</p>
            </div>
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-6 h-6 rounded-lg accent-orange-500"
              />
              <span className="text-sm">{isPublic ? "公开" : "屏蔽"}</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 min-h-[44px] rounded-xl border border-input bg-muted text-foreground"
          >
            取消
          </button>
          <button
            onClick={doSave}
            disabled={saving}
            className="flex-1 min-h-[44px] rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateAssetDialog;
