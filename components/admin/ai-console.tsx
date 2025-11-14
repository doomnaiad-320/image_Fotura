"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import useSWR from "swr";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { httpFetch } from "@/lib/http";

const providerSchema = z.object({
  slug: z.union([
    z.literal(""),
    z
      .string()
      .min(2, "至少 2 个字符")
      .max(40, "最多 40 个字符")
      .regex(
        /^[a-z0-9-]+$/,
        "只允许小写字母、数字和连字符，例如: openai, gpt-4, claude-3"
      )
  ]),
  name: z.string().min(2, "至少 2 个字符"),
  baseURL: z.string().url("请输入有效的 URL"),
  apiKey: z.string().optional().nullable(),
  enabled: z.boolean()
});

export type ProviderView = {
  id: string;
  slug: string;
  name: string;
  baseURL: string;
  enabled: boolean;
  hasApiKey: boolean;
  createdAt: string;
};

type ImagePricingView = {
  unit: "image";
  currency: string;
  base: number;
  editBase?: number;
  sizeMultipliers?: Record<string, number>;
};

type TokenPricingView = {
  unit: "token";
  currency: string;
  inputPerK: number;
  outputPerK: number;
  minimum: number;
};

type ModelPricingView = ImagePricingView | TokenPricingView | null;

export type ModelView = {
  slug: string;
  displayName: string;
  provider: {
    slug: string;
    name: string;
  };
  modalities: string[];
  tags: string[];
  supportsStream: boolean;
  enabled: boolean;
  isPromptOptimizer: boolean;
  sort: number;
  pricing: ModelPricingView;
};

type RemoteModelView = {
  id: string;
  name?: string;
  description?: string;
  capabilities?: string[];
};

type UserView = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  credits: number;
  createdAt: string;
  updatedAt: string;
};

type LogView = {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  ip?: string | null;
  userAgent?: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  metadata: Record<string, unknown>;
};

type Props = {
  initialProviders: ProviderView[];
  initialModels: ModelView[];
};

const fetcher = (url: string) => httpFetch<any>(url);

const DEFAULT_IMAGE_SIZE_KEYS = ["512x512", "768x768", "1024x1024", "1024x1536"];

type ImageLogView = {
  id: string;
  requestId: string;
  status: "success" | "failed";
  createdAt: string;
  cost: number | null;
  providerSlug: string | null;
  modelSlug: string | null;
  model: {
    id: string;
    slug: string;
    displayName: string;
  } | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

type TabKey = "providers";

export function AdminAIConsole({ initialProviders, initialModels }: Props) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "providers", label: "AI 管理" }
  ];


  const { data: providersData, mutate: mutateProviders } = useSWR(
    "/api/providers",
    fetcher,
    { fallbackData: { providers: initialProviders } }
  );

  const { data: modelsData, mutate: mutateModels } = useSWR("/api/ai/models", fetcher, {
    fallbackData: { models: initialModels }
  });

  // 渠道新增/编辑弹窗
  const [providerModal, setProviderModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    submitting: boolean;
    initial: Partial<z.infer<typeof providerSchema>> | null;
    editingSlug: string | null;
  }>({ open: false, mode: "create", submitting: false, initial: null, editingSlug: null });

  const normalizeArray = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const normalizePricing = (value: unknown): ModelPricingView => {
    if (!value) {
      return null;
    }
    let raw: any = value;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        return null;
      }
    }
    if (!raw || typeof raw !== "object") {
      return null;
    }
    if (raw.unit === "image") {
      const sizeMultipliers = raw.sizeMultipliers && typeof raw.sizeMultipliers === "object"
        ? Object.fromEntries(
            Object.entries(raw.sizeMultipliers as Record<string, unknown>).map(([key, val]) => [
              key,
              Number(val ?? 1)
            ])
          )
        : undefined;
      const pricing: ImagePricingView = {
        unit: "image",
        currency: typeof raw.currency === "string" ? raw.currency : "credit",
        base: Number(raw.base ?? 0),
        editBase: raw.editBase != null ? Number(raw.editBase) : undefined,
        sizeMultipliers
      };
      return pricing;
    }
    if (raw.unit === "token") {
      const pricing: TokenPricingView = {
        unit: "token",
        currency: typeof raw.currency === "string" ? raw.currency : "credit",
        inputPerK: Number(raw.inputPerK ?? 10),
        outputPerK: Number(raw.outputPerK ?? 30),
        minimum: Number(raw.minimum ?? 15)
      };
      return pricing;
    }
    return null;
  };

  const modelsList = useMemo(() => {
    const list = (modelsData?.models ?? initialModels) as any[];
    return list.map((model) => ({
      ...model,
      modalities: normalizeArray(model.modalities),
      tags: normalizeArray(model.tags),
      pricing: normalizePricing(model.pricing)
    }));
  }, [modelsData, initialModels]);

  const form = useForm<z.infer<typeof providerSchema>>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      slug: "",
      name: "",
      baseURL: "https://",
      apiKey: "",
      enabled: true
    }
  });

  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);
  const [togglingOptimizer, setTogglingOptimizer] = useState<string | null>(null);

  const [modelSelector, setModelSelector] = useState<{
    open: boolean;
    loading: boolean;
    importing: boolean;
    provider: ProviderView | null;
    models: RemoteModelView[];
    selected: Set<string>;
  }>({
    open: false,
    loading: false,
    importing: false,
    provider: null,
    models: [],
    selected: new Set()
  });

  const [creditModal, setCreditModal] = useState<{
    open: boolean;
    user: UserView | null;
    mode: "increase" | "decrease";
    amount: string;
    reason: string;
    submitting: boolean;
  }>({
    open: false,
    user: null,
    mode: "increase",
    amount: "",
    reason: "",
    submitting: false
  });

  const [pricingModal, setPricingModal] = useState<{
    open: boolean;
    model: ModelView | null;
    base: string;
    editBase: string;
    multipliers: Record<string, string>;
    submitting: boolean;
  }>({
    open: false,
    model: null,
    base: "",
    editBase: "",
    multipliers: DEFAULT_IMAGE_SIZE_KEYS.reduce<Record<string, string>>((acc, key) => {
      acc[key] = "1";
      return acc;
    }, {}),
    submitting: false
  });

  const providers: ProviderView[] = providersData?.providers ?? [];

  // 生成 slug（隐藏，不在 UI 中输入）
  const slugify = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const ensureUniqueSlug = (base: string) => {
    const exists = new Set(providers.map((p) => p.slug));
    let candidate = base || "channel";
    let i = 2;
    while (exists.has(candidate)) {
      candidate = `${base}-${i++}`;
    }
    return candidate;
  };

  const openCreateProvider = () => {
    setProviderModal({ open: true, mode: "create", submitting: false, initial: { name: "", baseURL: "https://", apiKey: "", enabled: true, slug: "" }, editingSlug: null });
    form.reset({ slug: "", name: "", baseURL: "https://", apiKey: "", enabled: true });
  };

  const openEditProvider = (provider: ProviderView) => {
    setProviderModal({
      open: true,
      mode: "edit",
      submitting: false,
      initial: { slug: provider.slug, name: provider.name, baseURL: provider.baseURL, apiKey: "", enabled: provider.enabled },
      editingSlug: provider.slug
    });
    form.reset({ slug: provider.slug, name: provider.name, baseURL: provider.baseURL, apiKey: "", enabled: provider.enabled });
  };

  const submitProviderModal = form.handleSubmit(async (values) => {
    try {
      setProviderModal((prev) => ({ ...prev, submitting: true }));
      const payload = { ...values } as any;
      if (providerModal.mode === "create") {
        const generated = ensureUniqueSlug(slugify(values.name));
        payload.slug = generated;
      } else {
        payload.slug = providerModal.editingSlug ?? values.slug;
      }
      await httpFetch("/api/providers", { method: "POST", body: JSON.stringify(payload) });
      toast.success(providerModal.mode === "create" ? "渠道已创建" : "渠道已更新");
      await mutateProviders();
      await mutateModels();
      setProviderModal({ open: false, mode: "create", submitting: false, initial: null, editingSlug: null });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "保存失败");
      setProviderModal((prev) => ({ ...prev, submitting: false }));
    }
  });

  const handleEditProvider = (provider: ProviderView) => openEditProvider(provider);

  const handleDeleteProvider = async (provider: ProviderView) => {
    if (!window.confirm(`确认删除 Provider ${provider.name} 吗？`)) {
      return;
    }
    try {
      setDeleting(provider.slug);
      await httpFetch(`/api/providers/${provider.slug}`, { method: "DELETE" });
      toast.success("Provider 已删除");
      await mutateProviders();
      await mutateModels();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const handleSyncAll = async (slug: string) => {
    try {
      setSyncing(slug);
      await httpFetch(`/api/providers/${slug}/sync`, { method: "POST" });
      toast.success("已同步全部模型");
      await mutateModels();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "同步失败");
    } finally {
      setSyncing(null);
    }
  };

  const handleDeleteModel = async (slug: string, name: string) => {
    if (!window.confirm(`确认删除模型 ${name} 吗？`)) {
      return;
    }
    try {
      setDeletingModel(slug);
      await httpFetch(`/api/models/${slug}`, { method: "DELETE" });
      toast.success("模型已删除");
      await mutateModels();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingModel(null);
    }
  };

  const handleTogglePromptOptimizer = async (slug: string, isCurrentlyOptimizer: boolean) => {
    try {
      setTogglingOptimizer(slug);
      if (isCurrentlyOptimizer) {
        // 取消优化器标记
        await httpFetch(`/api/models/${slug}/optimizer`, { method: "DELETE" });
        toast.success("已取消 Prompt 优化器标记");
      } else {
        // 设置为优化器
        await httpFetch(`/api/models/${slug}/optimizer`, { method: "POST" });
        toast.success("已设置为 Prompt 优化器");
      }
      await mutateModels();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setTogglingOptimizer(null);
    }
  };

  const openModelSelector = async (provider: ProviderView) => {
    setModelSelector({
      open: true,
      loading: true,
      importing: false,
      provider,
      models: [],
      selected: new Set()
    });

    try {
      const response = await httpFetch<{ models: RemoteModelView[] }>(
        `/api/providers/${provider.slug}/remote-models`
      );
      const remoteModels = response.models ?? [];
      // 默认：全部不选中，交由管理员手动勾选
      setModelSelector({
        open: true,
        loading: false,
        importing: false,
        provider,
        models: remoteModels,
        selected: new Set()
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "获取远程模型失败");
      setModelSelector({
        open: false,
        loading: false,
        importing: false,
        provider: null,
        models: [],
        selected: new Set()
      });
    }
  };

  const toggleModelSelection = (id: string) => {
    setModelSelector((prev) => {
      const selected = new Set(prev.selected);
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        selected.add(id);
      }
      return { ...prev, selected };
    });
  };

  const handleImportSelectedModels = async () => {
    if (!modelSelector.provider || modelSelector.selected.size === 0) {
      toast.error("请至少选择一个模型");
      return;
    }
    try {
      setModelSelector((prev) => ({ ...prev, importing: true }));
      await httpFetch(`/api/providers/${modelSelector.provider?.slug}/import`, {
        method: "POST",
        body: JSON.stringify({ modelIds: Array.from(modelSelector.selected) })
      });
      toast.success("模型已导入");
      await mutateModels();
      setModelSelector({
        open: false,
        loading: false,
        importing: false,
        provider: null,
        models: [],
        selected: new Set()
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "导入失败");
      setModelSelector((prev) => ({ ...prev, importing: false }));
    }
  };

  const handleRoleChange = async (userId: string, role: "user" | "admin") => {
    try {
      await httpFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      });
      toast.success("角色已更新");
      await mutateUsers();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "更新失败");
    }
  };

  const resetCreditModal = () =>
    setCreditModal({
      open: false,
      user: null,
      mode: "increase",
      amount: "",
      reason: "",
      submitting: false
    });

  const openCreditAdjustment = (user: UserView) => {
    setCreditModal({
      open: true,
      user,
      mode: "increase",
      amount: "",
      reason: "",
      submitting: false
    });
  };

  const submitCreditAdjustment = async () => {
    if (!creditModal.user) {
      return;
    }
    const amount = Number(creditModal.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      toast.error("请输入有效的豆数");
      return;
    }
    const delta = creditModal.mode === "increase" ? amount : -amount;
    try {
      setCreditModal((prev) => ({ ...prev, submitting: true }));
      await httpFetch(`/api/admin/users/${creditModal.user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          creditsDelta: delta,
          reason: creditModal.reason ? creditModal.reason : undefined
        })
      });
      toast.success("豆已调整");
      await mutateUsers();
      resetCreditModal();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "调整失败");
      setCreditModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const resetPricingModal = () =>
    setPricingModal({
      open: false,
      model: null,
      base: "",
      editBase: "",
      multipliers: DEFAULT_IMAGE_SIZE_KEYS.reduce<Record<string, string>>((acc, key) => {
        acc[key] = "1";
        return acc;
      }, {}),
      submitting: false
    });

  const openPricingModalForModel = (model: ModelView) => {
    const imagePricing = model.pricing && model.pricing.unit === "image" ? model.pricing : null;
    const keys = Array.from(
      new Set([
        ...DEFAULT_IMAGE_SIZE_KEYS,
        ...(imagePricing?.sizeMultipliers ? Object.keys(imagePricing.sizeMultipliers) : [])
      ])
    );
    const multipliers = keys.reduce<Record<string, string>>((acc, key) => {
      const value = imagePricing?.sizeMultipliers?.[key];
      acc[key] = value != null ? String(value) : "1";
      return acc;
    }, {});

    setPricingModal({
      open: true,
      model,
      base: imagePricing?.base ? String(imagePricing.base) : "",
      editBase:
        imagePricing?.editBase != null && !Number.isNaN(imagePricing.editBase)
          ? String(imagePricing.editBase)
          : "",
      multipliers,
      submitting: false
    });
  };

  const updatePricingMultiplier = (key: string, value: string) => {
    setPricingModal((prev) => ({
      ...prev,
      multipliers: {
        ...prev.multipliers,
        [key]: value
      }
    }));
  };

  const submitPricing = async () => {
    if (!pricingModal.model) {
      return;
    }

    const baseValue = Number(pricingModal.base);
    if (!Number.isFinite(baseValue) || baseValue <= 0) {
      toast.error("请输入有效的基础价格");
      return;
    }

    let editBaseValue: number | undefined;
    if (pricingModal.editBase.trim()) {
      const parsed = Number(pricingModal.editBase);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error("请输入有效的重绘价格");
        return;
      }
      editBaseValue = parsed;
    }

    const multipliersEntries = Object.entries(pricingModal.multipliers);
    const sizeMultipliers: Record<string, number> = {};
    for (const [key, raw] of multipliersEntries) {
      const value = Number(raw);
      if (Number.isFinite(value) && value > 0) {
        sizeMultipliers[key] = Number(value.toFixed(2));
      }
    }

    const payload: ImagePricingView = {
      unit: "image",
      currency: "credit",
      base: Math.round(baseValue),
      ...(editBaseValue ? { editBase: Math.round(editBaseValue) } : {}),
      ...(Object.keys(sizeMultipliers).length > 0 ? { sizeMultipliers } : {})
    };

    try {
      setPricingModal((prev) => ({ ...prev, submitting: true }));
      await httpFetch(`/api/models/${pricingModal.model.slug}`, {
        method: "PUT",
        body: JSON.stringify({ pricing: payload })
      });
      toast.success("价格已更新");
      await mutateModels();
      resetPricingModal();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "保存失败");
      setPricingModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const providersTab = (
    <div className="space-y-8">
      <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">渠道（Provider）</h3>
          <Button size="sm" onClick={openCreateProvider}>添加渠道</Button>
        </div>
        <div className="space-y-3 text-sm">
          {providers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              尚无渠道，点击右上角“添加渠道”创建。
            </div>
          )}
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="space-y-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.baseURL}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {provider.enabled ? "启用" : "禁用"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Button variant="secondary" size="sm" onClick={() => handleEditProvider(provider)}>
                  编辑
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={syncing === provider.slug}
                  onClick={() => handleSyncAll(provider.slug)}
                >
                  同步全部
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openModelSelector(provider)}
                >
                  选择模型
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={deleting === provider.slug}
                  onClick={() => handleDeleteProvider(provider)}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">模型库</h2>
          <Button variant="secondary" size="sm" onClick={() => mutateModels()}>
            刷新
          </Button>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="min-w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">模型</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">模态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {modelsList.map((model) => (
                <tr key={model.slug} className="border-t border-border hover:bg-accent">
                    <td className="px-4 py-3 text-foreground">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-semibold">{model.displayName}</div>
                          <div className="text-xs text-muted-foreground">{model.slug}</div>
                        </div>
{model.isPromptOptimizer && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:border-fuchsia-700">
                            ⚡ 优化器
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {model.provider.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {model.modalities.length > 0 ? model.modalities.join(" · ") : "-"}
                      {model.pricing && model.pricing.unit === "image" && (
<span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                          {model.pricing.base}/次
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openPricingModalForModel(model)}
                        >
                          设置价格
                        </Button>
                        <Button
                          variant={model.isPromptOptimizer ? "primary" : "secondary"}
                          size="sm"
                          loading={togglingOptimizer === model.slug}
                          onClick={() => handleTogglePromptOptimizer(model.slug, model.isPromptOptimizer)}
                        >
                          {model.isPromptOptimizer ? "优化器" : "设为优化器"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={deletingModel === model.slug}
                          onClick={() => handleDeleteModel(model.slug, model.displayName)}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                </tr>
              ))}
              {modelsList.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    暂无模型，请先同步 Provider。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );





  return (
    <div className="space-y-8">
      {providersTab}

      {providerModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-border bg-popover p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                {providerModal.mode === "create" ? "添加渠道" : "编辑渠道"}
              </h3>
              {providerModal.mode === "edit" && providerModal.editingSlug && (
                <p className="text-xs text-muted-foreground">Slug：{providerModal.editingSlug}</p>
              )}
            </header>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">渠道名称</label>
                <Input placeholder="例如 OpenRouter" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-400">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Base URL</label>
                <Input placeholder="https://openrouter.ai/api" {...form.register("baseURL")} />
                {form.formState.errors.baseURL && (
                  <p className="text-xs text-red-400">{form.formState.errors.baseURL.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">API Key</label>
                <Input placeholder={providerModal.mode === "edit" ? "留空保持原值" : "可选"} type="password" {...form.register("apiKey")} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">状态</label>
                <Select
                  value={form.watch("enabled") ? "enabled" : "disabled"}
                  onChange={(event) => form.setValue("enabled", event.target.value === "enabled")}
                >
                  <option value="enabled">启用</option>
                  <option value="disabled">禁用</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setProviderModal({ open: false, mode: "create", submitting: false, initial: null, editingSlug: null })} disabled={providerModal.submitting}>
                取消
              </Button>
              <Button onClick={submitProviderModal} loading={providerModal.submitting}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {pricingModal.open && pricingModal.model && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-border bg-popover p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">设置价格</h3>
              <p className="text-xs text-muted-foreground">
                {pricingModal.model.displayName} · {pricingModal.model.slug}
              </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  基础价格 (文生图)
                </label>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  placeholder="例如 60"
                  value={pricingModal.base}
                  onChange={(event) =>
                    setPricingModal((prev) => ({ ...prev, base: event.target.value.replace(/[^0-9]/g, "") }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  重绘价格 (可选)
                </label>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  placeholder="默认同基础价"
                  value={pricingModal.editBase}
                  onChange={(event) =>
                    setPricingModal((prev) => ({ ...prev, editBase: event.target.value.replace(/[^0-9]/g, "") }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  尺寸倍率
                </span>
                <span className="text-xs text-muted-foreground">根据尺寸调整 Credits 消耗</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.keys(pricingModal.multipliers).map((key) => (
                  <div key={key} className="space-y-2">
                    <label className="text-xs text-muted-foreground">{key}</label>
                    <Input
                      inputMode="decimal"
                      pattern="[0-9]*([.,][0-9]+)?"
                      min={0.1}
                      step={0.1}
                      value={pricingModal.multipliers[key]}
                      onChange={(event) => updatePricingMultiplier(key, event.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={resetPricingModal} disabled={pricingModal.submitting}>
                取消
              </Button>
              <Button onClick={submitPricing} loading={pricingModal.submitting}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {modelSelector.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
          <div className="w-full max-w-3xl space-y-4 rounded-3xl border border-border bg-popover p-6">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {modelSelector.provider?.name} · 模型选择
                </h3>
                <p className="text-xs text-muted-foreground">
                  已同步模型会更新为启用状态，未选中的模型会保持禁用。
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setModelSelector({
                open: false,
                loading: false,
                importing: false,
                provider: null,
                models: [],
                selected: new Set()
              })}>
                关闭
              </Button>
            </header>

            {modelSelector.loading ? (
              <div className="grid place-items-center py-12 text-sm text-muted-foreground">
                正在拉取远程模型...
              </div>
            ) : (
              <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-border p-4">
                {modelSelector.models.map((model) => (
                  <label
                    key={model.id}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={modelSelector.selected.has(model.id)}
                      onChange={() => toggleModelSelection(model.id)}
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">{model.name ?? model.id}</div>
                      <div className="text-xs text-muted-foreground">{model.id}</div>
                      {model.capabilities && model.capabilities.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {model.capabilities.join(" · ")}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
                {modelSelector.models.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground">该 Provider 暂无可用模型。</div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                已选 {modelSelector.selected.size} 个模型
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setModelSelector((prev) => ({
                      ...prev,
                      selected: new Set(prev.models.map((model) => model.id))
                    }))
                  }
                >
                  全选
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setModelSelector((prev) => ({
                      ...prev,
                      selected: new Set()
                    }))
                  }
                >
                  清空
                </Button>
                <Button
                  onClick={handleImportSelectedModels}
                  loading={modelSelector.importing}
                  disabled={modelSelector.selected.size === 0}
                >
                  导入选中
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
