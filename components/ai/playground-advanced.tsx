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
import { useLocalHistory } from "@/lib/hooks/useLocalHistory";

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
  const [promptOrigin, setPromptOrigin] = useState<'history' | 'manual'>('manual');
  // 使用本地存储 Hook 替代内存状态
  const {
    history,
    loading: historyLoading,
    addHistory: addLocalHistory,
    supported: storageSupported,
    searchHistory,
    showAll,
    filterByModel,
    showFavorites,
    toggleFavorite
  } = useLocalHistory();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => imageModels.find((model) => model.slug === selectedImageModel) ?? null,
    [imageModels, selectedImageModel]
  );

  const modelSizeMap = useMemo(() => {
    const pricing = selectedModel?.pricing;
    const sizeMultipliers =
      pricing && typeof pricing === "object" && "sizeMultipliers" in pricing
        ? (pricing as { sizeMultipliers?: Record<string, unknown> }).sizeMultipliers
        : undefined;

    if (!sizeMultipliers || typeof sizeMultipliers !== "object") {
      return ASPECT_RATIO_OPTIONS;
    }

    const entries = Object.keys(sizeMultipliers).reduce<Record<string, string[]>>(
      (acc, size) => {
        if (typeof size !== "string") {
          return acc;
        }
        const [widthStr, heightStr] = size.split("x");
        const width = Number(widthStr);
        const height = Number(heightStr);
        if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
          return acc;
        }
        const gcdValue = (function gcd(a: number, b: number): number {
          return b === 0 ? a : gcd(b, a % b);
        })(width, height);
        const ratioKey = `${width / gcdValue}:${height / gcdValue}`;
        if (!acc[ratioKey]) {
          acc[ratioKey] = [];
        }
        acc[ratioKey].push(size);
        return acc;
      },
      {}
    );

    if (Object.keys(entries).length === 0) {
      return ASPECT_RATIO_OPTIONS;
    }

    return Object.fromEntries(
      Object.entries(entries).map(([ratio, sizes]) => [ratio, sizes.sort((a, b) => a.localeCompare(b))])
    );
  }, [selectedModel]);

  const ratioOptions = useMemo(() => Object.keys(modelSizeMap), [modelSizeMap]);
  const sizeOptions = useMemo(
    () => modelSizeMap[aspectRatio] ?? [],
    [modelSizeMap, aspectRatio]
  );

  useEffect(() => {
    if (ratioOptions.length === 0) {
      if (aspectRatio !== "") {
        setAspectRatio("");
      }
      if (imageSize !== "") {
        setImageSize("");
      }
      return;
    }

    if (!ratioOptions.includes(aspectRatio)) {
      setAspectRatio(ratioOptions[0]);
    }
  }, [ratioOptions, aspectRatio, imageSize]);

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
    // 通过本地代理拉取，避免跨域/304问题
    const isHttp = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
    const proxyUrl = isHttp ? `/api/proxy/image?url=${encodeURIComponent(imageUrl)}` : imageUrl;

    fetch(proxyUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const type = blob.type || "image/png";
        const file = new File([blob], `input-${Date.now()}.png`, { type });
        
        // 从历史记录中查找对应的提示词和元数据
        const historyItem = history.find(h => h.url === imageUrl);
        
        // 保存原图URL用于对比显示
        if (!originalImageUrl) {
          setOriginalImageUrl(imageUrl);
        }
        
        // 加载图片到编辑器
        handleImageSelect(file, imageUrl);
        
        // 切换到图生图模式
        setMode("img2img");
        
        // 如果找到历史记录，继承提示词
        if (historyItem && historyItem.prompt) {
          setImagePrompt(historyItem.prompt);
          setPromptOrigin('history');
          toast.success(`已加载为输入图，提示词已继承`);
        } else {
          setPromptOrigin('manual');
          toast.success("图片已设为输入，可以开始二次编辑");
        }
        
        // 清空之前的生成结果，准备新编辑
        setGeneratedImageUrl(null);
      })
      .catch((err) => {
        console.error(err);
        toast.error("设置输入图片失败");
      });
  }, [handleImageSelect, history, originalImageUrl]);

  const addToHistory = useCallback(async (imageUrl: string, prompt: string, modelSlug?: string, genMode?: GenerationMode, size?: string) => {
    console.log('[History] 开始保存历史记录:', { imageUrl: imageUrl.slice(0, 50), prompt: prompt.slice(0, 30), modelSlug, genMode });
    
    // 获取模型显示名称
    const model = imageModels.find(m => m.slug === modelSlug);
    const modelName = model?.displayName;
    
    try {
      if (storageSupported) {
        console.log('[History] IndexedDB 支持, 开始保存...');
        // 使用本地存储，并拿到本地URL
        const { localUrl, historyId } = await addLocalHistory(imageUrl, prompt, {
          model: modelSlug,
          modelName: modelName,
          mode: genMode,
          size: size,
          parameters: {
            aspectRatio: aspectRatio
          }
        });
        console.log('[History] 保存成功! historyId:', historyId, 'localUrl:', localUrl.slice(0, 50));
        // 用本地URL更新结果展示，保证"作为输入"直接读取本地
        setGeneratedImageUrl(localUrl);
      } else {
        // 降级：使用内存存储（刷新会丢失）
        console.warn('[History] 浏览器不支持 IndexedDB，使用内存存储');
      }
    } catch (error) {
      console.error('[History] 保存历史记录失败:', error);
      // 不阻塞用户操作
    }
  }, [imageModels, addLocalHistory, storageSupported, aspectRatio]);

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

      // 先显示临时URL
      setGeneratedImageUrl(imageUrl);
      
      // 异步保存到历史记录(会更新为本地URL)
      await addToHistory(imageUrl, imagePrompt, selectedImageModel, mode, imageSize);
      
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
<div className="space-y-4 rounded-3xl border border-default bg-surface p-5">
          <div className="space-y-2">
<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">生成模式</p>
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
<p className="text-xs text-muted-foreground">
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
<div className="space-y-4 rounded-3xl border border-default bg-surface p-5">
          <div className="space-y-2">
<label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
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
<label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                图片比例
              </label>
              <Select
                value={aspectRatio}
                onChange={(event) => setAspectRatio(event.target.value)}
                disabled={ratioOptions.length === 0}
              >
                {ratioOptions.length === 0 ? (
                  <option value="">暂无可用比例</option>
                ) : (
                  ratioOptions.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))
                )}
              </Select>
            </div>
            <div className="space-y-2">
<label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
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
<div className="space-y-4 rounded-3xl border border-default bg-surface p-5">
            <div className="flex items-center justify-between">
<label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
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
<div className="space-y-3 rounded-3xl border border-default bg-surface p-5">
          <div className="flex items-center justify-between">
<label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              提示词
            </label>
            {promptOrigin === 'history' && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-500/20 text-orange-500 border border-orange-500/30">
                已继承
              </span>
            )}
          </div>
          <Textarea
            rows={6}
            placeholder="描述你想要生成的画面，例如：霓虹灯下的赛博朋克街道，强调反射与光影。"
            value={imagePrompt}
            onChange={(event) => {
              setImagePrompt(event.target.value);
              setPromptOrigin('manual');
            }}
          />
          <div className="flex items-center justify-between">
<p className="text-xs text-muted-foreground">
              提示词越具体，越能帮助模型生成符合预期的内容。
            </p>
            {mode === 'img2img' && imagePrompt && (
              <button
                onClick={() => {
                  setImagePrompt('');
                  setPromptOrigin('manual');
                }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                清空
              </button>
            )}
          </div>
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
<h3 className="text-lg font-semibold text-foreground">生成结果</h3>
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
        onSearch={(kw) => kw ? searchHistory(kw) : showAll()}
        onFilterModel={(m) => m ? filterByModel(m) : showAll()}
        onShowFavorites={() => showFavorites()}
        onShowAll={() => showAll()}
        onToggleFavorite={(id) => toggleFavorite(id)}
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