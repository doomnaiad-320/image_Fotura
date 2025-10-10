"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
  tags: string[];
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

const GENERATION_MODES = [
  { key: "txt2img", label: "文生图" },
  { key: "img2img", label: "图生图" }
] as const;

type GenerationMode = (typeof GENERATION_MODES)[number]["key"];

const ASPECT_RATIO_OPTIONS: Record<string, string[]> = {
  "1:1": ["512x512", "640x640", "768x768", "1024x1024"],
  "3:4": ["576x768", "768x1024", "960x1280"],
  "4:3": ["768x576", "1024x768", "1152x864"],
  "9:16": ["720x1280", "864x1536"]
};

const DEFAULT_RATIO = "1:1";

const toStringArray = (value: unknown): string[] => {
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
      modalities: toStringArray(model.modalities),
      tags: toStringArray((model as any).tags ?? model.tags)
    }));
  }, [modelResponse, models]);

  const [mode, setMode] = useState<GenerationMode>("txt2img");
  const [imagePrompt, setImagePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<string>(DEFAULT_RATIO);
  const [imageSize, setImageSize] = useState<string>(() => {
    const presets = ASPECT_RATIO_OPTIONS[DEFAULT_RATIO] ?? [];
    return presets[2] ?? presets[0] ?? "1024x1024";
  });
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResults, setImageResults] = useState<GeneratedImage[]>([]);
  const [selectedImageModel, setSelectedImageModel] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  const { data: balance, mutate: refreshBalance } = useSWR(
    isAuthenticated ? "/api/credits/balance" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  // 显示所有启用的模型，用户手动选择用于生图
  const imageModels = useMemo(() => latestModels, [latestModels]);

  const ratioOptions = useMemo(() => Object.keys(ASPECT_RATIO_OPTIONS), []);
  const sizeOptions = useMemo(
    () => ASPECT_RATIO_OPTIONS[aspectRatio] ?? [],
    [aspectRatio]
  );

  const clearReferenceImage = () => {
    setReferenceImage(null);
    setReferencePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  };

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

  useEffect(() => {
    if (sizeOptions.length === 0) {
      setImageSize("");
      return;
    }
    if (!sizeOptions.includes(imageSize)) {
      setImageSize(sizeOptions[0]);
    }
  }, [sizeOptions, imageSize]);

  useEffect(() => {
    if (mode === "txt2img") {
      clearReferenceImage();
    }
  }, [mode]);

  useEffect(
    () => () => {
      if (referencePreview) {
        URL.revokeObjectURL(referencePreview);
      }
    },
    [referencePreview]
  );

  const handleReferenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setReferenceImage(file);
    setReferencePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
    event.target.value = "";
  };

  const ensureLogin = () => {
    if (!isAuthenticated) {
      toast.error("请先登录以使用 AI 功能");
      return false;
    }
    return true;
  };

  const handleImageGenerate = async () => {
    if (!ensureLogin()) return;
    if (!imagePrompt.trim()) {
      toast.error("请输入提示词");
      return;
    }
    if (!selectedImageModel) {
      toast.error("请选择模型");
      return;
    }
    if (mode === "img2img" && !referenceImage) {
      toast.error("请上传参考图片");
      return;
    }

    const timestamp = Date.now();
    const fallbackMessage = mode === "img2img" ? "编辑失败" : "生成失败";

    try {
      setImageLoading(true);

      let payload: { url?: string; b64_json?: string }[] = [];

      if (mode === "img2img") {
        const formData = new FormData();
        formData.append("model", selectedImageModel);
        formData.append("prompt", imagePrompt);
        if (imageSize) {
          formData.append("size", imageSize);
        }
        formData.append("n", "1");
        if (referenceImage) {
          formData.append("image", referenceImage);
        }

        const response = await httpFetch<{ data: { url?: string; b64_json?: string }[] }>(
          "/api/ai/images/edits",
          {
            method: "POST",
            body: formData
          }
        );
        payload = response?.data ?? [];
      } else {
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
        payload = response?.data ?? [];
      }

      const results = payload
        .map((item, index) => {
          const url =
            item.url ?? (item.b64_json ? `data:image/png;base64,${item.b64_json}` : "");
          if (!url) {
            return null;
          }
          return {
            id: `${mode}-${selectedImageModel}-${timestamp}-${index}`,
            title: imagePrompt,
            url
          } satisfies GeneratedImage;
        })
        .filter((item): item is GeneratedImage => Boolean(item));

      if (results.length === 0) {
        toast.error("未返回图像数据");
        return;
      }

      setImageResults(results);
      await refreshBalance();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setImageLoading(false);
    }
  };

  const canSubmit =
    Boolean(selectedImageModel) &&
    Boolean(imageSize) &&
    (mode === "txt2img" || Boolean(referenceImage));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-6">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">生成模式</p>
            <div className="flex flex-wrap gap-2">
              {GENERATION_MODES.map((item) => (
                <Button
                  key={item.key}
                  variant={mode === item.key ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setMode(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400">
            豆余额：{balance?.credits ?? "--"}
          </p>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5">
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
                imageModels.map((model) => {
                  const basePrice =
                    model.pricing && model.pricing.unit === "image"
                      ? (model.pricing as any).base
                      : null;
                  return (
                    <option key={model.slug} value={model.slug}>
                      {model.displayName}
                      {basePrice ? ` · ${basePrice}豆/图` : ""}
                    </option>
                  );
                })
              )}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                图片比例
              </label>
              <Select
                value={aspectRatio}
                onChange={(event) => setAspectRatio(event.target.value)}
              >
                {ratioOptions.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500">选择常用比例以匹配你的使用场景。</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                图像尺寸
              </label>
              <Select
                value={imageSize}
                onChange={(event) => setImageSize(event.target.value)}
                disabled={sizeOptions.length === 0}
              >
                {sizeOptions.length === 0 ? (
                  <option value="">暂无尺寸</option>
                ) : (
                  sizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))
                )}
              </Select>
            </div>
          </div>
          {imageModels.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
              暂无可用模型，请联系管理员在后台同步 Provider。
            </p>
          )}
        </div>

        {mode === "img2img" && (
          <div className="space-y-3 rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                参考图片
              </label>
              {referenceImage && (
                <Button variant="secondary" size="sm" onClick={clearReferenceImage}>
                  移除
                </Button>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleReferenceChange}
              className="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-white/20"
            />
            {referencePreview ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <img src={referencePreview} alt="参考图片预览" className="w-full" />
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                上传原始图片作为底图，模型会在此基础上进行细节重绘。
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 rounded-3xl border border-white/10 bg-black/30 p-5">
          <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
            提示词
          </label>
          <Textarea
            rows={6}
            placeholder="描述你想要生成的画面，例如：霓虹灯下的赛博朋克街道，强调反射与光影。"
            value={imagePrompt}
            onChange={(event) => setImagePrompt(event.target.value)}
          />
          <p className="text-xs text-gray-500">
            提示词越具体，越能帮助模型生成符合预期的内容。
          </p>
        </div>

        <Button
          className="w-full"
          onClick={handleImageGenerate}
          loading={imageLoading}
          disabled={!canSubmit || imageLoading}
        >
          {mode === "img2img" ? "重绘图像" : "生成图像"}
        </Button>
      </aside>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">生成结果</h3>
          <span className="text-xs text-gray-500">
            {imageResults.length > 0
              ? `已生成 ${imageResults.length} 张图像`
              : "结果将展示在此处"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {imageResults.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-black/40"
            >
              <img src={item.url} alt={item.title} className="w-full" />
              <div className="p-3 text-sm text-gray-400">{item.title}</div>
            </div>
          ))}
          {imageResults.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-xs text-gray-500 sm:col-span-2 xl:col-span-3">
              生成结果将在这里展示，支持保存与下载。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
