"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { httpFetch } from "@/lib/http";
import ImageEditorCanvas from "./image-editor-canvas";
import ResultDisplay from "./result-display";
import HistoryPanel, { GeneratedImage } from "./history-panel";

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
  pricing?: any;
};

type Props = {
  models: ModelOption[];
  isAuthenticated: boolean;
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

export function AIPlaygroundAdvanced({ models, isAuthenticated }: Props) {
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

  // 显示所有启用的模型，用户手动选择用于生图
  const imageModels = useMemo(() => latestModels, [latestModels]);

  const { data: balance, mutate: refreshBalance } = useSWR(
    isAuthenticated ? "/api/credits/balance" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  // States
  const [mode, setMode] = useState<GenerationMode>("txt2img");
  const [imagePrompt, setImagePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<string>(DEFAULT_RATIO);
  const [imageSize, setImageSize] = useState<string>(() => {
    const presets = ASPECT_RATIO_OPTIONS[DEFAULT_RATIO] ?? [];
    return presets[2] ?? presets[0] ?? "1024x1024";
  });
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState<string | null>(null);
  
  // New states for advanced features
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [isMaskToolActive, setIsMaskToolActive] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const ratioOptions = useMemo(() => Object.keys(ASPECT_RATIO_OPTIONS), []);
  const sizeOptions = useMemo(
    () => ASPECT_RATIO_OPTIONS[aspectRatio] ?? [],
    [aspectRatio]
  );

  // Effects
  useEffect(() => {
    if (imageModels.length === 0) {
      setSelectedImageModel(null);
      return;
    }
    // 只在已选模型不存在时清空，不自动选择第一个
    setSelectedImageModel((prev) => {
      if (prev && imageModels.some((model) => model.slug === prev)) {
        return prev;
      }
      // 返回 null 而不是自动选择第一个模型
      return null;
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
      setCurrentImageUrl(null);
      setCurrentImageFile(null);
      setMaskDataUrl(null);
      setIsMaskToolActive(false);
    }
  }, [mode]);

  // Handlers
  const handleImageSelect = useCallback((file: File, dataUrl: string) => {
    setCurrentImageFile(file);
    setCurrentImageUrl(dataUrl);
    setMaskDataUrl(null);
    if (!originalImageUrl) {
      setOriginalImageUrl(dataUrl);
    }
  }, [originalImageUrl]);

  const handleClearImage = useCallback(() => {
    setCurrentImageUrl(null);
    setCurrentImageFile(null);
    setMaskDataUrl(null);
    setIsMaskToolActive(false);
  }, []);

  const handleMaskChange = useCallback((dataUrl: string | null) => {
    setMaskDataUrl(dataUrl);
  }, []);

  const handleUseImageAsInput = useCallback((imageUrl: string) => {
    // Convert the image URL to a File object for seamless integration
    fetch(imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `input-${Date.now()}.png`, { type: 'image/png' });
        handleImageSelect(file, imageUrl);
        setMode("img2img");
        toast.success("图片已设为输入");
      })
      .catch(() => {
        toast.error("设置输入图片失败");
      });
  }, [handleImageSelect]);

  const addToHistory = useCallback((imageUrl: string, title: string) => {
    const newImage: GeneratedImage = {
      id: `generated-${Date.now()}-${Math.random()}`,
      url: imageUrl,
      title,
      timestamp: Date.now()
    };
    setHistory(prev => [newImage, ...prev]);
  }, []);

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
    if (mode === "img2img" && !currentImageFile) {
      toast.error("请上传参考图片");
      return;
    }

    const timestamp = Date.now();
    const fallbackMessage = mode === "img2img" ? "编辑失败" : "生成失败";

    try {
      setImageLoading(true);

      let payload: { url?: string; b64_json?: string }[] = [];

      if (mode === "img2img" && currentImageFile) {
        const formData = new FormData();
        formData.append("model", selectedImageModel);
        formData.append("prompt", imagePrompt);
        if (imageSize) {
          formData.append("size", imageSize);
        }
        formData.append("n", "1");
        formData.append("image", currentImageFile);
        
        // Add mask if available
        if (maskDataUrl) {
          const maskBlob = await fetch(maskDataUrl).then(res => res.blob());
          const maskFile = new File([maskBlob], "mask.png", { type: "image/png" });
          formData.append("mask", maskFile);
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

      const imageData = payload[0];
      if (!imageData) {
        toast.error("未返回图像数据");
        return;
      }

      const imageUrl = imageData.url ?? (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : "");
      if (!imageUrl) {
        toast.error("图像数据格式错误");
        return;
      }

      setGeneratedImageUrl(imageUrl);
      addToHistory(imageUrl, imagePrompt);
      await refreshBalance();
      toast.success("生成成功！");

    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setImageLoading(false);
    }
  };

  const handlePreviewImage = useCallback((imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewImageUrl(null);
  }, []);

  const canSubmit =
    Boolean(selectedImageModel) &&
    Boolean(imageSize) &&
    (mode === "txt2img" || Boolean(currentImageFile));

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      {/* Left Panel - Controls */}
      <aside className="space-y-6">
        {/* Mode Selection */}
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
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              豆余额：{balance?.credits ?? "--"}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史记录
            </Button>
          </div>
        </div>

        {/* Model Selection */}
        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
              模型
            </label>
            <Select
              value={selectedImageModel ?? ""}
              onChange={(event) => setSelectedImageModel(event.target.value || null)}
              disabled={imageModels.length === 0}
            >
              {imageModels.length === 0 ? (
                <option value="">暂无可用模型</option>
              ) : (
                <>
                  <option value="">请选择模型</option>
                  {imageModels.map((model) => {
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
                  })}
                </>
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
        </div>

        {/* Image Editor Canvas */}
        {mode === "img2img" && (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                输入图片
              </label>
              {currentImageUrl && (
                <Button
                  variant={isMaskToolActive ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setIsMaskToolActive(!isMaskToolActive)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  局部涂选
                </Button>
              )}
            </div>
            <ImageEditorCanvas
              initialImageUrl={currentImageUrl}
              onImageSelect={handleImageSelect}
              onClearImage={handleClearImage}
              onMaskChange={handleMaskChange}
              isMaskToolActive={isMaskToolActive}
            />
          </div>
        )}

        {/* Prompt Input */}
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

        {/* Generate Button */}
        <Button
          className="w-full"
          onClick={handleImageGenerate}
          loading={imageLoading}
          disabled={!canSubmit || imageLoading}
        >
          {mode === "img2img" ? "重绘图像" : "生成图像"}
        </Button>
      </aside>

      {/* Right Panel - Results */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">生成结果</h3>
          <span className="text-xs text-gray-500">
            {generatedImageUrl ? "生成完成" : "结果将展示在此处"}
          </span>
        </div>
        
        <div className="h-[600px]">
          <ResultDisplay
            imageUrl={generatedImageUrl}
            originalImageUrl={originalImageUrl}
            onUseImageAsInput={handleUseImageAsInput}
            onImageClick={handlePreviewImage}
          />
        </div>
      </section>

      {/* History Panel */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onUseImage={handleUseImageAsInput}
        onDownload={() => {}}
      />

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closePreview}>
          <div className="relative max-w-4xl max-h-[90vh] m-4">
            <button 
              onClick={closePreview}
              className="absolute -top-4 -right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={previewImageUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}