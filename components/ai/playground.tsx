"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeneratedImage = {
  id: string;
  url: string;
  title: string;
};

const fetcher = (url: string) => httpFetch<any>(url);

export function AIPlayground({ models, isAuthenticated }: Props) {
  const [tab, setTab] = useState<"chat" | "image">("chat");
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedChatModel, setSelectedChatModel] = useState<string | null>(
    () => models.find((model) => model.modalities.includes("text"))?.slug ?? null
  );

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResults, setImageResults] = useState<GeneratedImage[]>([]);
  const [selectedImageModel, setSelectedImageModel] = useState<string | null>(
    () => models.find((model) => model.modalities.includes("image"))?.slug ?? null
  );

  const { data: balance, mutate: refreshBalance } = useSWR(
    isAuthenticated ? "/api/credits/balance" : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const chatModels = useMemo(
    () => models.filter((model) => model.modalities.includes("text")),
    [models]
  );

  const imageModels = useMemo(
    () => models.filter((model) => model.modalities.includes("image")),
    [models]
  );

  const ensureLogin = () => {
    if (!isAuthenticated) {
      toast.error("请先登录以使用 AI 功能");
      return false;
    }
    return true;
  };

  const handleChatSubmit = async () => {
    if (!ensureLogin()) return;
    if (!chatPrompt.trim() || !selectedChatModel) {
      toast.error("请选择模型并输入提示词");
      return;
    }

    const messages = [...chatHistory, { role: "user" as const, content: chatPrompt }];

    try {
      setChatLoading(true);
      setChatHistory(messages);
      setChatPrompt("");

      const response = await httpFetch<{ choices: { message: { content: string } }[] }>(
        "/api/ai/chat/completions",
        {
          method: "POST",
          body: JSON.stringify({
            model: selectedChatModel,
            messages: messages.map((message) => ({
              role: message.role,
              content: message.content
            })),
            stream: false
          })
        }
      );

      const content = response?.choices?.[0]?.message?.content ?? "(无响应)";
      setChatHistory((prev) => [...prev, { role: "assistant", content }]);
      await refreshBalance();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "调用失败");
    } finally {
      setChatLoading(false);
    }
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

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/30 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={tab === "chat" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("chat")}
          >
            文本对话
          </Button>
          <Button
            variant={tab === "image" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("image")}
          >
            图像生成
          </Button>
        </div>
        <div className="text-xs text-gray-400">
          Credits 余额：{balance?.credits ?? "--"}
        </div>
      </div>

      {tab === "chat" ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
              模型
            </label>
            <Select
              value={selectedChatModel ?? ""}
              onChange={(event) => setSelectedChatModel(event.target.value)}
            >
              {chatModels.map((model) => (
                <option key={model.slug} value={model.slug}>
                  {model.displayName} · {model.provider.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-4">
            <Textarea
              rows={4}
              placeholder="输入你的问题或提示词"
              value={chatPrompt}
              onChange={(event) => setChatPrompt(event.target.value)}
            />
            <Button onClick={handleChatSubmit} loading={chatLoading}>
              发送对话
            </Button>
          </div>
          <div className="space-y-3">
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-black/40 p-4 text-sm"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  {message.role === "user" ? "你" : "AI"}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-gray-200">{message.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                模型
              </label>
              <Select
                value={selectedImageModel ?? ""}
                onChange={(event) => setSelectedImageModel(event.target.value)}
              >
                {imageModels.map((model) => (
                  <option key={model.slug} value={model.slug}>
                    {model.displayName} · {model.provider.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                图像尺寸
              </label>
              <Input value={imageSize} onChange={(event) => setImageSize(event.target.value)} />
            </div>
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-4">
            <Textarea
              rows={4}
              placeholder="描述你想要生成的画面"
              value={imagePrompt}
              onChange={(event) => setImagePrompt(event.target.value)}
            />
            <Button onClick={handleImageGenerate} loading={imageLoading}>
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
          </div>
        </div>
      )}
    </div>
  );
}
