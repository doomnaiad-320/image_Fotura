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
  slug: z.string().min(2),
  name: z.string().min(2),
  baseURL: z.string().url(),
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

export type ModelView = {
  slug: string;
  displayName: string;
  provider: {
    slug: string;
    name: string;
  };
  modalities: string[];
  supportsStream: boolean;
  enabled: boolean;
  sort: number;
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

export function AdminAIConsole({ initialProviders, initialModels }: Props) {
  const tabs: { key: "providers" | "users" | "logs"; label: string }[] = [
    { key: "providers", label: "Provider 管理" },
    { key: "users", label: "用户管理" },
    { key: "logs", label: "操作日志" }
  ];

  const [activeTab, setActiveTab] = useState<"providers" | "users" | "logs">("providers");

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

  const normalizeArray = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => String(item)) : [];

  const modelsList = useMemo(() => {
    const list = (modelsData?.models ?? initialModels) as any[];
    return list.map((model) => ({
      ...model,
      modalities: normalizeArray(model.modalities)
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

  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});

  const providers: ProviderView[] = providersData?.providers ?? [];
  const users: UserView[] = usersData?.users ?? [];
  const logs: LogView[] = logsData?.logs ?? [];

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

  const handleCreditsAdjust = async (userId: string, deltaSign: 1 | -1) => {
    const value = creditInputs[userId];
    const amount = Number(value);
    if (!amount || Number.isNaN(amount)) {
      toast.error("请输入有效的积分数");
      return;
    }
    const delta = amount * deltaSign;
    try {
      await httpFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          creditsDelta: delta,
          reason: reasonInputs[userId] || undefined
        })
      });
      toast.success("积分已调整");
      setCreditInputs((prev) => ({ ...prev, [userId]: "" }));
      await mutateUsers();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "调整失败");
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
              placeholder="openrouter"
              disabled={Boolean(editingSlug)}
              {...form.register("slug")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">名称</label>
            <Input placeholder="OpenRouter" {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Base URL</label>
            <Input placeholder="https://openrouter.ai/api" {...form.register("baseURL")} />
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
                    <div className="font-semibold">{model.displayName}</div>
                    <div className="text-xs text-gray-500">{model.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {model.provider.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {model.modalities.length > 0 ? model.modalities.join(" · ") : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={model.enabled ? "secondary" : "primary"}
                      size="sm"
                      onClick={async () => {
                        try {
                          await httpFetch(`/api/models/${model.slug}`, {
                            method: "PATCH",
                            body: JSON.stringify({ enabled: !model.enabled })
                          });
                          toast.success("状态已更新");
                          await mutateModels();
                        } catch (error) {
                          console.error(error);
                          toast.error(error instanceof Error ? error.message : "更新失败");
                        }
                      }}
                    >
                      {model.enabled ? "禁用" : "启用"}
                    </Button>
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
              <th className="px-4 py-3">积分余额</th>
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
                  <div className="flex flex-col items-end gap-2">
                    <Input
                      type="number"
                      placeholder="积分"
                      value={creditInputs[user.id] ?? ""}
                      onChange={(event) =>
                        setCreditInputs((prev) => ({ ...prev, [user.id]: event.target.value }))
                      }
                      className="w-32"
                    />
                    <Textarea
                      rows={2}
                      placeholder="调整原因 (可选)"
                      value={reasonInputs[user.id] ?? ""}
                      onChange={(event) =>
                        setReasonInputs((prev) => ({ ...prev, [user.id]: event.target.value }))
                      }
                      className="w-48"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCreditsAdjust(user.id, 1)}
                      >
                        增加
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCreditsAdjust(user.id, -1)}
                      >
                        扣除
                      </Button>
                    </div>
                  </div>
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
