"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { httpFetch } from "@/lib/http";

export type ModelOption = {
  slug: string;
  displayName: string;
  provider: {
    slug: string;
    name: string;
  };
  modalities: string[];
  supportsStream: boolean;
};

type Props = {
  models: ModelOption[];
  isAuthenticated: boolean;
};

type GeneratedImage = {
  id: string;
  url: string;
  title: string;
};

const fetcher = (url: string) => httpFetch<any>(url);

export function AIPlayground({ models, isAuthenticated }: Props) {
  const { data: modelResponse } = useSWR<{ models: ModelOption[] }>(
    "/api/ai/models",
    fetcher,
    {
      fallbackData: { models },
      refreshInterval: 60_000
    }
  );

  const latestModels = useMemo(() => {
    const list = modelResponse?.models ?? models;
    return list.map((model) => ({
      ...model,
      modalities: Array.isArray(model.modalities)
        ? model.modalities
        : typeof model.modalities === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(model.modalities);
                return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
              } catch {
                return [];
              }
            })()
          : []
    }));
  }, [modelResponse, models]);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResults, setImageResults] = useState<GeneratedImage[]>([]);
  const [selectedImageModel, setSelectedImageModel] = useState<string | null>(null);

  const { data: balance, mutate: refreshBalance } = useSWR(
    isAuthenticated ? "/api/credits/balance" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const imageModels = useMemo(
    () => latestModels.filter((model) => model.modalities.includes("image")),
    [latestModels]
  );

  useEffect(() => {
    if (imageModels.length === 0) {
      setSelectedImageModel(null);
      return;
    }
    setSelectedImageModel((prev) => {
      if (prev && imageModels.some((model) => model.slug === prev)) {
        return prev;
      }
      return imageModels[0]?.slug ?? null;
    });
  }, [imageModels]);

  const ensureLogin = () => {
    if (!isAuthenticated) {
      toast.error("请先登录以使用 AI 功能");
      return false;
    }
    return true;
  };

  const handleImageGenerate = async () => {
    if (!ensureLogin()) return;
    if (!imagePrompt.trim() || !selectedImageModel) {
      toast.error("请选择模型并输入提示词");
      return;
    }

    try {
      setImageLoading(true);
      const response = await httpFetch<{ data: { url?: string; b64_json?: string }[] }>(
        "/api/ai/images/generations",
        {
          method: "POST",
          body: JSON.stringify({
            model: selectedImageModel,
            prompt: imagePrompt,
            size: imageSize,
            n: 1,
            response_format: "url"
          })
        }
      );

      const data = response?.data ?? [];
      setImageResults(
        data
          .filter((item) => item.url)
          .map((item, index) => ({
            id: `${selectedImageModel}-${Date.now()}-${index}`,
            title: imagePrompt,
            url: item.url ?? ""
          }))
      );
      await refreshBalance();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setImageLoading(false);
    }
  };

  const availableSizes = [
    "512x512",
    "640x640",
    "768x768",
    "896x1152",
    "1024x1024",
    "1024x1536"
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/30 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-white">图像生成</p>
          <p className="text-xs text-gray-500">选择模型及尺寸，输入提示词即可生成图片。</p>
        </div>
        <div className="text-xs text-gray-400">
          Credits 余额：{balance?.credits ?? "--"}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
              模型
            </label>
            <Select
              value={selectedImageModel ?? ""}
              onChange={(event) => setSelectedImageModel(event.target.value)}
              disabled={imageModels.length === 0}
            >
              {imageModels.length === 0 ? (
                <option value="">暂无可用模型</option>
              ) : (
                imageModels.map((model) => (
                  <option key={model.slug} value={model.slug}>
                    {model.displayName} · {model.provider.name}
                  </option>
                ))
              )}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
              图像尺寸
            </label>
            <Select
              value={imageSize}
              onChange={(event) => setImageSize(event.target.value)}
            >
              {availableSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-4">
          <Textarea
            rows={4}
            placeholder="描述你想要生成的画面"
            value={imagePrompt}
            onChange={(event) => setImagePrompt(event.target.value)}
          />
          <Button
            onClick={handleImageGenerate}
            loading={imageLoading}
            disabled={!selectedImageModel}
          >
            生成图像
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {imageResults.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-black/40"
            >
              <img src={item.url} alt={item.title} className="w-full" />
              <div className="p-3 text-sm text-gray-400">{item.title}</div>
            </div>
          ))}
          {!imageResults.length && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-xs text-gray-500 md:col-span-2 lg:col-span-3">
              输入提示词并生成后，结果将展示在这里。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
