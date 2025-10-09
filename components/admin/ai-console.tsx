"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import useSWR from "swr";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

type Props = {
  initialProviders: ProviderView[];
  initialModels: ModelView[];
};

const fetcher = (url: string) => httpFetch<any>(url);

export function AdminAIConsole({ initialProviders, initialModels }: Props) {
  const { data: providersData, mutate: mutateProviders } = useSWR(
    "/api/providers",
    fetcher,
    {
      fallbackData: { providers: initialProviders }
    }
  );

  const { data: modelsData, mutate: mutateModels } = useSWR(
    "/api/ai/models",
    fetcher,
    {
      fallbackData: { models: initialModels }
    }
  );

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
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      await httpFetch("/api/providers", {
        method: "POST",
        body: JSON.stringify(values)
      });
      toast.success("Provider 保存成功");
      form.reset();
      await mutateProviders();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  });

  const handleSync = async (slug: string) => {
    try {
      setSyncing(slug);
      await httpFetch(`/api/providers/${slug}/sync`, { method: "POST" });
      toast.success("模型同步完成");
      await mutateModels();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "同步失败");
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleModel = async (slug: string, nextState: boolean) => {
    try {
      await httpFetch(`/api/models/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextState })
      });
      toast.success("状态已更新");
      await mutateModels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新失败");
    }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Provider 管理</h2>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-5"
            onSubmit={onSubmit}
          >
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Slug</label>
              <Input placeholder="openrouter" {...form.register("slug")} />
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
                placeholder="可选"
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
            <Button type="submit" className="w-full" loading={submitting}>
              保存 Provider
            </Button>
          </form>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5">
            <h3 className="text-sm font-medium text-white">现有 Provider</h3>
            <div className="space-y-3 text-sm">
              {providersData?.providers?.map((provider: ProviderView) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.baseURL}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {provider.enabled ? "启用" : "禁用"}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={syncing === provider.slug}
                      onClick={() => handleSync(provider.slug)}
                    >
                      同步模型
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">模型库</h2>
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
              {modelsData?.models?.map((model: ModelView) => (
                <tr
                  key={model.slug}
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-white">
                    <div className="font-semibold">{model.displayName}</div>
                    <div className="text-xs text-gray-500">{model.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {model.provider.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {model.modalities.join(" · ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={model.enabled ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => handleToggleModel(model.slug, !model.enabled)}
                    >
                      {model.enabled ? "禁用" : "启用"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
