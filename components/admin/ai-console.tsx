"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import useSWR from "swr";
import { PublishedGrid } from "@/components/asset/published-grid";
import { ReusedThumbGrid } from "@/components/asset/reused-thumb-grid";
import { FavoritesThumbGrid } from "@/components/asset/favorites-thumb-grid";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { httpFetch } from "@/lib/http";

const providerSchema = z.object({
  slug: z
    .string()
    .min(2, "至少 2 个字符")
    .max(40, "最多 40 个字符")
    .regex(
      /^[a-z0-9-]+$/,
      "只允许小写字母、数字和连字符，例如: openai, gpt-4, claude-3"
    ),
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

type TabKey = "providers" | "users" | "logs" | "imageLogs" | "me";

export function AdminAIConsole({ initialProviders, initialModels }: Props) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "providers", label: "Provider 管理" },
    { key: "users", label: "用户管理" },
    { key: "logs", label: "操作日志" },
    { key: "imageLogs", label: "生成日志" },
    { key: "me", label: "个人主页" }
  ];

  const [activeTab, setActiveTab] = useState<TabKey>("providers");

  const { data: providersData, mutate: mutateProviders } = useSWR(
    "/api/providers",
    fetcher,
    { fallbackData: { providers: initialProviders } }
  );

  const { data: modelsData, mutate: mutateModels } = useSWR("/api/ai/models", fetcher, {
    fallbackData: { models: initialModels }
  });

  const { data: usersData, mutate: mutateUsers } = useSWR("/api/admin/users", fetcher, {
    fallbackData: { users: [] }
  });

  const { data: logsData, mutate: mutateLogs } = useSWR("/api/admin/logs", fetcher, {
    fallbackData: { logs: [] },
    refreshInterval: 60_000
  });

  const { data: imageLogsData, mutate: mutateImageLogs } = useSWR(
    "/api/admin/image-logs",
    fetcher,
    {
      fallbackData: { logs: [] },
      refreshInterval: 60_000
    }
  );

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

  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
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
  const users: UserView[] = usersData?.users ?? [];
  const logs: LogView[] = logsData?.logs ?? [];
  const imageLogs: ImageLogView[] = imageLogsData?.logs ?? [];

  // 个人主页数据
  const { data: meData, mutate: mutateMe } = useSWR("/api/me/overview", fetcher, {
    fallbackData: { published: [], reused: [], favorites: [] }
  });

  const resetForm = () => {
    form.reset({
      slug: "",
      name: "",
      baseURL: "https://",
      apiKey: "",
      enabled: true
    });
    setEditingSlug(null);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      await httpFetch("/api/providers", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          slug: editingSlug ?? values.slug
        })
      });
      toast.success(editingSlug ? "Provider 已更新" : "Provider 已创建");
      await mutateProviders();
      await mutateModels();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  });

  const handleEditProvider = (provider: ProviderView) => {
    form.reset({
      slug: provider.slug,
      name: provider.name,
      baseURL: provider.baseURL,
      apiKey: "",
      enabled: provider.enabled
    });
    setEditingSlug(provider.slug);
  };

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
      if (editingSlug === provider.slug) {
        resetForm();
      }
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
      setModelSelector({
        open: true,
        loading: false,
        importing: false,
        provider,
        models: remoteModels,
        selected: new Set(remoteModels.map((model) => model.id))
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
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-5"
          onSubmit={onSubmit}
        >
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Slug</label>
            <Input
              placeholder="openai"
              disabled={Boolean(editingSlug)}
              {...form.register("slug")}
            />
            {form.formState.errors.slug ? (
              <p className="text-xs text-red-400">
                {form.formState.errors.slug.message}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                只允许小写字母、数字和连字符，例如: openai, gpt-4-turbo
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">名称</label>
            <Input placeholder="OpenRouter" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-red-400">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Base URL</label>
            <Input placeholder="https://openrouter.ai/api" {...form.register("baseURL")} />
            {form.formState.errors.baseURL && (
              <p className="text-xs text-red-400">
                {form.formState.errors.baseURL.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">API Key</label>
            <Input
              placeholder={editingSlug ? "留空保持原值" : "可选"}
              type="password"
              {...form.register("apiKey")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">状态</label>
            <Select
              value={form.watch("enabled") ? "enabled" : "disabled"}
              onChange={(event) => form.setValue("enabled", event.target.value === "enabled")}
            >
              <option value="enabled">启用</option>
              <option value="disabled">禁用</option>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" className="flex-1" loading={submitting}>
              {editingSlug ? "更新 Provider" : "保存 Provider"}
            </Button>
            {editingSlug && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                取消编辑
              </Button>
            )}
          </div>
        </form>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">现有 Provider</h3>
          </div>
          <div className="space-y-3 text-sm">
            {providers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-gray-500">
                尚无 Provider，先在左侧表单创建。
              </div>
            )}
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.baseURL}</p>
                  </div>
                  <span className="text-xs text-gray-400">
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
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">模型库</h2>
          <Button variant="secondary" size="sm" onClick={() => mutateModels()}>
            刷新
          </Button>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
          <table className="min-w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-gray-500">
              <tr>
                <th className="px-4 py-3">模型</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">模态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {modelsList.map((model) => (
                <tr key={model.slug} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-semibold">{model.displayName}</div>
                          <div className="text-xs text-gray-500">{model.slug}</div>
                        </div>
                        {model.isPromptOptimizer && (
                          <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300">
                            ⚡ Prompt 优化器
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {model.provider.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {model.modalities.length > 0 ? model.modalities.join(" · ") : "-"}
                      {model.pricing && model.pricing.unit === "image" && (
                        <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                          {model.pricing.base}豆/图
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
                          {model.isPromptOptimizer ? "✅ 优化器" : "设为优化器"}
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
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-500">
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

  const usersTab = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">用户列表</h2>
        <Button variant="secondary" size="sm" onClick={() => mutateUsers()}>
          刷新
        </Button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
        <table className="min-w-full text-left text-sm text-gray-300">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-gray-500">
            <tr>
              <th className="px-4 py-3">用户</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">豆余额</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{user.email}</div>
                  <div className="text-xs text-gray-500">{user.name ?? "未设置昵称"}</div>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={user.role}
                    onChange={(event) =>
                      handleRoleChange(user.id, event.target.value as "user" | "admin")
                    }
                    className="w-28"
                  >
                    <option value="user">用户</option>
                    <option value="admin">管理员</option>
                  </Select>
                </td>
                <td className="px-4 py-3 text-white">
                  {user.credits}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(user.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openCreditAdjustment(user)}
                  >
                    调整豆
                  </Button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-gray-500">
                  暂无用户数据。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const logsTab = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">操作日志</h2>
        <Button variant="secondary" size="sm" onClick={() => mutateLogs()}>
          刷新
        </Button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
        <table className="min-w-full text-left text-sm text-gray-300">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-gray-500">
            <tr>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">操作</th>
              <th className="px-4 py-3">描述</th>
              <th className="px-4 py-3">操作者</th>
              <th className="px-4 py-3 text-right">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-white">{log.action}</td>
                <td className="px-4 py-3 text-xs text-gray-300">{log.description}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {log.user?.email ?? "系统"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">
                  {log.ip ?? "-"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-gray-500">
                  暂无日志记录。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );


  const imageLogsTab = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">生成日志</h2>
        <Button variant="secondary" size="sm" onClick={() => mutateImageLogs()}>
          刷新
        </Button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
        <table className="min-w-full text-left text-sm text-gray-300">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-gray-500">
            <tr>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">用户</th>
              <th className="px-4 py-3">模型</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">消耗</th>
              <th className="px-4 py-3 text-right">请求 ID</th>
            </tr>
          </thead>
          <tbody>
            {imageLogs.map((log) => {
              const statusLabel = log.status === "success" ? "成功" : "失败";
              const statusClass =
                log.status === "success" ? "text-emerald-400" : "text-rose-400";
              return (
                <tr key={log.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-white">
                    <div>{log.user?.email ?? "未知用户"}</div>
                    <div className="text-gray-500">{log.user?.name ?? "未设置昵称"}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {log.model?.displayName ?? log.modelSlug ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {log.providerSlug ?? "-"}
                  </td>
                  <td className={`px-4 py-3 text-xs ${statusClass}`}>{statusLabel}</td>
                  <td className="px-4 py-3 text-xs text-white">
                    {typeof log.cost === "number" ? log.cost : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">
                    {log.requestId}
                  </td>
                </tr>
              );
            })}
            {imageLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-xs text-gray-500">
                  暂无生成日志记录。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "primary" : "secondary"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "providers" && providersTab}
      {activeTab === "users" && usersTab}
      {activeTab === "logs" && logsTab}
      {activeTab === "imageLogs" && imageLogsTab}

      {activeTab === "me" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">个人主页</h2>
            <Button variant="secondary" size="sm" onClick={() => mutateMe()}>
              刷新
            </Button>
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <section className="space-y-3 xl:col-span-1">
              <h3 className="text-sm text-gray-400">已发布</h3>
              <PublishedGrid initialItems={(meData?.published ?? []) as any} isAuthenticated={true} />
            </section>
            <section className="space-y-3 xl:col-span-1">
              <h3 className="text-sm text-gray-400">已复用</h3>
              <ReusedThumbGrid initialItems={(meData?.reused ?? []) as any} isAuthenticated={true} />
            </section>
            <section className="space-y-3 xl:col-span-1">
              <h3 className="text-sm text-gray-400">收藏</h3>
              <FavoritesThumbGrid initialItems={(meData?.favorites ?? []) as any} isAuthenticated={true} />
            </section>
          </div>
        </div>
      )}

      {creditModal.open && creditModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-black p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-white">调整豆</h3>
              <p className="text-xs text-gray-500">
                {creditModal.user.email} · 当前余额 {creditModal.user.credits} 豆
              </p>
            </header>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  操作
                </label>
                <Select
                  value={creditModal.mode}
                  onChange={(event) =>
                    setCreditModal((prev) => ({
                      ...prev,
                      mode: event.target.value as "increase" | "decrease"
                    }))
                  }
                >
                  <option value="increase">增加豆</option>
                  <option value="decrease">扣除豆</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  数量
                </label>
                <Input
                  type="number"
                  placeholder="输入豆数"
                  value={creditModal.amount}
                  onChange={(event) =>
                    setCreditModal((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  min={0}
                />
                <p className="text-xs text-gray-500">
                  正整数，实际操作方向以上方选择为准。
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  原因 (可选)
                </label>
                <Textarea
                  rows={3}
                  placeholder="备注原因，便于后续追溯"
                  value={creditModal.reason}
                  onChange={(event) =>
                    setCreditModal((prev) => ({ ...prev, reason: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={resetCreditModal} disabled={creditModal.submitting}>
                取消
              </Button>
              <Button
                onClick={submitCreditAdjustment}
                loading={creditModal.submitting}
                disabled={!creditModal.amount.trim()}
              >
                确认
              </Button>
            </div>
          </div>
        </div>
      )}

      {pricingModal.open && pricingModal.model && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-white/10 bg-black p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-white">设置价格</h3>
              <p className="text-xs text-gray-500">
                {pricingModal.model.displayName} · {pricingModal.model.slug}
              </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
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
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
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
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  尺寸倍率
                </span>
                <span className="text-xs text-gray-500">根据尺寸调整 Credits 消耗</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.keys(pricingModal.multipliers).map((key) => (
                  <div key={key} className="space-y-2">
                    <label className="text-xs text-gray-500">{key}</label>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-3xl space-y-4 rounded-3xl border border-white/10 bg-black p-6">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {modelSelector.provider?.name} · 模型选择
                </h3>
                <p className="text-xs text-gray-500">
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
              <div className="grid place-items-center py-12 text-sm text-gray-400">
                正在拉取远程模型...
              </div>
            ) : (
              <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4">
                {modelSelector.models.map((model) => (
                  <label
                    key={model.id}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/40 p-4"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={modelSelector.selected.has(model.id)}
                      onChange={() => toggleModelSelection(model.id)}
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white">{model.name ?? model.id}</div>
                      <div className="text-xs text-gray-500">{model.id}</div>
                      {model.capabilities && model.capabilities.length > 0 && (
                        <div className="text-xs text-gray-400">
                          {model.capabilities.join(" · ")}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
                {modelSelector.models.length === 0 && (
                  <div className="text-center text-xs text-gray-500">该 Provider 暂无可用模型。</div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
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
