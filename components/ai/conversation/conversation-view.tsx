'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";

import { AssetFeed } from "@/components/asset/asset-feed";
import { createEditChain, generateConversationTitle } from "@/lib/ai/prompt-chain";
import type { AssetListItem, AssetListResponse } from "@/lib/assets";
import { useLocalHistory } from "@/lib/hooks/useLocalHistory";
import { httpFetch } from "@/lib/http";
import { getConversationDB, isConversationDBSupported } from "@/lib/storage/conversation-db";
import { imageBlobStore } from "@/lib/storage/image-blob";
import type { Conversation, ConversationMessage } from "@/types/conversation";

import { type HistoryItem } from "../history-sidebar";
import { HistoryGalleryView } from "./history-gallery-view";
import type { ModelOption } from "../playground";

import ConversationHeader, { StudioTopBarActions } from "./conversation-header";
import ConversationSidebar from "./conversation-sidebar";
import InputArea from "./input-area";
import MessageList from "./message-list";
import PromptFusionDialog from "./prompt-fusion-dialog";
import PublishDialog from "./publish-dialog";

interface ConversationViewProps {
  models: ModelOption[];
  isAuthenticated: boolean;
  user?: { email: string; credits: number; role: string; };
}

const fetcher = <T = unknown>(url: string) => httpFetch<T>(url);

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === "string" && name === "AbortError";
  }
  return false;
};

export function ConversationView({ models, isAuthenticated, user }: ConversationViewProps) {
  // 状态管理
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  type RightView = 'conversation' | 'explore';
  const [activeView, setActiveView] = useState<RightView>('conversation');
  // const [isHistoryOpen, setIsHistoryOpen] = useState(false); // Removed state
  const historyAutoOpenedRef = useRef(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState(() => `conv-${Date.now()}`);
  const [parentMessageId, setParentMessageId] = useState<string | null>(null);
  const [inheritedPrompt, setInheritedPrompt] = useState<string>('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<ConversationMessage | null>(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isFusionOpen, setIsFusionOpen] = useState(false);
  const [fusionBasePrompt, setFusionBasePrompt] = useState<string>("");
  const [fusionAsset, setFusionAsset] = useState<{ id: string; title: string; coverUrl?: string; size?: string } | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  const selectableModels = useMemo(() => models.filter(model => !model.isPromptOptimizer), [models]);

  useEffect(() => {
    if (selectedModel && !selectableModels.some(model => model.slug === selectedModel)) {
      setSelectedModel(selectableModels[0]?.slug ?? null);
    }
  }, [selectableModels, selectedModel]);


  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const { addHistory } = useLocalHistory();
  const dbSupported = isConversationDBSupported();

  // 跟随输入区高度，给消息列表增加底部内边距，避免被 sticky 输入区遮挡
  const inputStickyRef = useRef<HTMLDivElement>(null);
  const [bottomPad, setBottomPad] = useState(96);
  useEffect(() => {
    const el = inputStickyRef.current;
    if (!el) return;
    const update = () => setBottomPad(el.offsetHeight || 96);
    update();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      const id = window.setInterval(update, 500);
      return () => window.clearInterval(id);
    }
  }, []);

  // 获取积分余额
  const { data: balance, mutate: refreshBalance } = useSWR(
    isAuthenticated ? '/api/credits/balance' : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  // 探索：首页瀑布流初始化数据（懒加载）
  const [exploreInit, setExploreInit] = useState<{ items: AssetListItem[]; cursor: string | null } | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);
  useEffect(() => {
    const loadExplore = async () => {
      try {
        setExploreLoading(true);
        const res = await httpFetch<AssetListResponse>(
          '/api/assets?type=all&sort=hot&limit=12',
          { method: 'GET' }
        );
        setExploreInit({ items: res.items || [], cursor: res.nextCursor || null });
      } catch (e) {
        toast.error('加载探索内容失败');
      } finally {
        setExploreLoading(false);
      }
    };
    if (activeView === 'explore' && !exploreInit && !exploreLoading) {
      void loadExplore();
    }
  }, [activeView, exploreInit, exploreLoading]);

  // 检查复用预填数据
  useEffect(() => {
    const checkReusePrefill = async () => {
      try {
        const prefillDataStr = localStorage.getItem('reuse_prefill_data');
        if (prefillDataStr) {
          const prefillData = JSON.parse(prefillDataStr);

          // 检查数据是否过期（5分钟）
          const now = Date.now();
          if (prefillData.timestamp && now - prefillData.timestamp < 5 * 60 * 1000) {
            console.log('[ConversationView] 检测到复用预填数据:', prefillData);

            // 显示提示
            toast.success(`已加载复用作品：${prefillData.assetTitle || '无标题'}`);

            // 仅用于融合，不预填输入区，避免用户再次点击发送产生重复生成
            if (prefillData.prompt) {
              setFusionBasePrompt(prefillData.prompt);
            }

            // 如果有模型信息，尝试设置
            if (prefillData.modelSlug) {
              const matchedModel = selectableModels.find(m => m.slug === prefillData.modelSlug);
              if (matchedModel) {
                setSelectedModel(matchedModel.slug);
              }
            }

            // 设置融合弹窗数据并打开
            setFusionAsset({
              id: prefillData.assetId,
              title: prefillData.assetTitle,
              coverUrl: prefillData.coverUrl,
              size: prefillData.size
            });
            setIsFusionOpen(true);
          }

          // 清除已使用的数据
          localStorage.removeItem('reuse_prefill_data');
        }
      } catch (error) {
        console.error('[ConversationView] 读取复用数据失败:', error);
      }
    };

    // 延迟执行，确保在对话恢复后
    setTimeout(async () => {
      await checkReusePrefill();
    }, 500);
  }, [selectableModels]);

  // 初始化：恢复最后的对话
  useEffect(() => {
    const loadLastConversation = async () => {
      if (!dbSupported) {
        console.log('[ConversationView] IndexedDB 不支持，使用内存模式');
        setIsLoadingConversation(false);
        return;
      }

      try {
        const db = await getConversationDB();
        const conversations = await db.listConversations(1);

        if (conversations.length > 0) {
          const lastConv = conversations[0];
          console.log('[ConversationView] 恢复对话:', lastConv.id);

          // 恢复对话ID
          setCurrentConversationId(lastConv.id);

          // 恢复消息
          const msgs = await db.getMessages(lastConv.id);

          // 恢复图片 Blob URL
          const restoredMsgs = await Promise.all(
            msgs.map(async (msg) => {
              if (msg.imageUrl) {
                // 尝试从 Blob 存储恢复 URL
                const newBlobURL = await imageBlobStore.getBlobURL(msg.id);
                if (newBlobURL) {
                  console.log('[ConversationView] 恢复图片 Blob:', msg.id);
                  return { ...msg, imageUrl: newBlobURL };
                }
              }
              return msg;
            })
          );

          setMessages(restoredMsgs);

          // 恢复最后使用的模型（过滤优化器）
          if (lastConv.lastActiveModel) {
            const matchedModel = selectableModels.find(m => m.slug === lastConv.lastActiveModel);
            setSelectedModel(matchedModel ? matchedModel.slug : selectableModels[0]?.slug ?? null);
          }

          console.log('[ConversationView] 已恢复', restoredMsgs.length, '条消息');
        } else {
          console.log('[ConversationView] 无历史对话，创建新对话');
          await createNewConversation();
        }
      } catch (error) {
        console.error('[ConversationView] 恢复对话失败:', error);
        toast.error('恢复对话失败，已创建新对话');
      } finally {
        setIsLoadingConversation(false);
      }
    };

    loadLastConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载所有对话列表
  useEffect(() => {
    const loadConversations = async () => {
      if (!dbSupported) return;

      try {
        const db = await getConversationDB();
        const allConvs = await db.listConversations(50);
        setConversations(allConvs);
      } catch (error) {
        console.error('[ConversationView] 加载对话列表失败:', error);
      }
    };

    if (!isLoadingConversation) {
      loadConversations();

      // 每 5 秒刷新一次列表
      const interval = setInterval(loadConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [dbSupported, isLoadingConversation]);

  // 自动滚动到底部（仅在接近底部时），并确保不被底部输入区遮挡
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasGenerating = messages.some(m => m.isGenerating);
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (hasGenerating || distance < 200) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [messages]);

  // 输入区高度变化时，尝试滚动到底部避免遮挡
  useEffect(() => {
    const handler = () => {
      const el = scrollRef.current;
      if (!el) return;
      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
      if (distance < bottomPad + 200) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    };
    window.addEventListener('input-area-resized', handler);
    return () => window.removeEventListener('input-area-resized', handler);
  }, [bottomPad]);

  // 确保登录
  const ensureLogin = useCallback(() => {
    if (!isAuthenticated) {
      toast.error('请先登录以使用 AI 功能');
      return false;
    }
    return true;
  }, [isAuthenticated]);

  // 创建新对话
  const createNewConversation = useCallback(async () => {
    try {
      const newConvId = `conv-${Date.now()}`;

      // 无论是否支持 IndexedDB，先更新内存状态，确保马上有一个全新会话
      setCurrentConversationId(newConvId);
      setMessages([]);
      setParentMessageId(null);
      setInheritedPrompt('');

      if (dbSupported) {
        const db = await getConversationDB();
        const newConv: Conversation = {
          id: newConvId,
          title: '新对话',
          messageIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActiveModel: selectedModel || undefined,
          messageCount: 0,
          imageCount: 0
        };
        await db.createConversation(newConv);
        // 刷新对话列表
        const allConvs = await db.listConversations(50);
        setConversations(allConvs);
      }

      console.log('[ConversationView] 新对话已创建:', newConvId);
      toast.success('已创建新对话');
    } catch (error) {
      console.error('[ConversationView] 创建对话失败:', error);
      toast.error('创建对话失败');
    }
  }, [dbSupported, selectedModel]);

  // 切换对话
  const handleSelectConversation = useCallback(async (conversationId: string) => {
    if (!dbSupported || conversationId === currentConversationId) return;

    try {
      const db = await getConversationDB();
      const conv = await db.getConversation(conversationId);

      if (!conv) {
        toast.error('对话不存在');
        return;
      }

      // 恢复消息
      const msgs = await db.getMessages(conversationId);

      // 恢复图片 Blob URL
      const restoredMsgs = await Promise.all(
        msgs.map(async (msg) => {
          if (msg.imageUrl) {
            const newBlobURL = await imageBlobStore.getBlobURL(msg.id);
            if (newBlobURL) {
              return { ...msg, imageUrl: newBlobURL };
            }
          }
          return msg;
        })
      );

      setCurrentConversationId(conversationId);
      setMessages(restoredMsgs);
      setParentMessageId(null);
      setInheritedPrompt('');

      // 切换回对话视图
      setActiveView('conversation');

      // 恢复模型选择，避免展示优化器
      if (conv.lastActiveModel) {
        const matchedModel = selectableModels.find(m => m.slug === conv.lastActiveModel);
        setSelectedModel(matchedModel ? matchedModel.slug : selectableModels[0]?.slug ?? null);
      }

      console.log('[ConversationView] 已切换到对话:', conversationId);
    } catch (error) {
      console.error('[ConversationView] 切换对话失败:', error);
      toast.error('切换对话失败');
    }
  }, [dbSupported, currentConversationId, selectableModels]);

  // 删除对话
  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    if (!dbSupported) return;

    try {
      const db = await getConversationDB();
      await db.deleteConversation(conversationId);

      // 刷新列表
      const allConvs = await db.listConversations(50);
      setConversations(allConvs);

      // 如果删除的是当前对话：优先切换到最近一条；若为空再新建
      if (conversationId === currentConversationId) {
        if (allConvs.length > 0) {
          await handleSelectConversation(allConvs[0].id);
        } else {
          // 仅在没有任何对话时才新建
          await createNewConversation();
        }
      }

      toast.success('已删除对话');
    } catch (error) {
      console.error('[ConversationView] 删除对话失败:', error);
      toast.error('删除对话失败');
    }
  }, [dbSupported, currentConversationId, createNewConversation, handleSelectConversation]);

  // 重命名对话
  const handleRenameConversation = useCallback(async (conversationId: string, title: string) => {
    if (!dbSupported) return;
    try {
      const db = await getConversationDB();
      await db.updateConversation(conversationId, { title });
      const allConvs = await db.listConversations(50);
      setConversations(allConvs);
      toast.success('已重命名对话');
    } catch (error) {
      console.error('[ConversationView] 重命名对话失败:', error);
      toast.error('重命名失败');
    }
  }, [dbSupported]);

  // 保存消息到 IndexedDB
  const saveMessageToDB = useCallback(async (message: ConversationMessage) => {
    if (!dbSupported) return;

    try {
      const db = await getConversationDB();

      // 如果消息包含图片，先保存 Blob
      if (message.imageUrl && message.imageUrl.startsWith('blob:')) {
        console.log('[ConversationView] 保存图片 Blob:', message.id);
        await imageBlobStore.saveBlobFromURL(message.id, message.imageUrl);
      }

      await db.saveMessage(message);

      // 更新对话标题（如果是第一条用户消息）
      const conversation = await db.getConversation(currentConversationId);
      if (conversation && conversation.title === '新对话' && message.role === 'user') {
        const newTitle = generateConversationTitle(message.content);
        await db.updateConversation(currentConversationId, { title: newTitle });
        console.log('[ConversationView] 对话标题已更新:', newTitle);
      }

      // 更新最后使用的模型
      if (selectedModel && conversation) {
        await db.updateConversation(currentConversationId, {
          lastActiveModel: selectedModel
        });
      }
    } catch (error) {
      console.error('[ConversationView] 保存消息失败:', error);
      // 不阻塞用户操作，只记录错误
    }
  }, [dbSupported, currentConversationId, selectedModel]);

  // 处理发送消息
  // 简单将 JSON 提示词转为可识别的纯文本（键值对）
  const normalizePromptForAI = (input: string): string => {
    try {
      const trimmed = input.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return input;
      const obj = JSON.parse(trimmed);
      const kv: string[] = [];
      const walk = (val: unknown, path: string[]) => {
        if (val == null) return;
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          kv.push(`${path.join('.')} : ${String(val)}`);
          return;
        }
        if (Array.isArray(val)) {
          kv.push(`${path.join('.')} : ${val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')}`);
          return;
        }
        if (typeof val === 'object') {
          Object.entries(val as Record<string, unknown>).forEach(([key, value]) =>
            walk(value, [...path, key])
          );
        }
      };
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => walk(item, [`item${i}`]));
      } else {
        walk(obj, []);
      }
      const text = kv.join(', ');
      return text.length > 0 ? text : input;
    } catch {
      return input;
    }
  };

  const handleSend = useCallback(async (
    prompt: string,
    uploadedImages?: File[],
    options?: { size?: string; aspectRatio?: string }
  ) => {
    if (!ensureLogin()) return;

    if (!selectedModel) {
      toast.error('请先选择模型');
      return;
    }

    const finalSize = options?.size || '1024x1024';
    const finalAspect = options?.aspectRatio || '1:1';

    // 判断是否为图生图模式
    // 1. 用户主动上传了图片 -> 强制图生图
    // 2. 自动持续编辑：找到最后一条 AI 回复作为父消息
    let parentMsg = null;
    let isEditMode = false;
    const hasUploadedImages = uploadedImages && uploadedImages.length > 0;

    if (!hasUploadedImages && messages.length > 0) {
      // 从后往前找最后一条 assistant 消息
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].imageUrl) {
          parentMsg = messages[i];
          isEditMode = true;
          break;
        }
      }
    } else if (hasUploadedImages) {
      isEditMode = true;
    }

    // 1. 添加用户消息（保留原始输入用于展示）
    const userMsg: ConversationMessage = {
      id: `msg-user-${Date.now()}`,
      conversationId: currentConversationId,
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    // 保存用户消息到 DB
    await saveMessageToDB(userMsg);

    // 2. 添加助手消息(生成中状态)
    const assistantMsgId = `msg-asst-${Date.now()}`;
    // 规范化文本（仅文生图时转换 JSON 为可识别文本）
    const normalizedPrompt = normalizePromptForAI(prompt);

    const assistantMsg: ConversationMessage = {
      id: assistantMsgId,
      conversationId: currentConversationId,
      role: 'assistant',
      content: normalizedPrompt,
      timestamp: Date.now(),
      isGenerating: true,
      generationParams: {
        model: selectedModel,
        modelName: models.find(m => m.slug === selectedModel)?.displayName || selectedModel,
        size: finalSize,
        mode: isEditMode ? 'img2img' : 'txt2img',
        aspectRatio: finalAspect
      }
    };
    setMessages(prev => [...prev, assistantMsg]);

    // 立刻滚动到底部，显示“生成中”占位
    setTimeout(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 0);

    // 重置父消息ID和继承提示词
    setParentMessageId(null);
    setInheritedPrompt('');

    try {
      let imageUrl: string;
      let editChain: ConversationMessage['editChain'];

      // 创建可取消的控制器
      const controller = new AbortController();
      abortControllersRef.current.set(assistantMsgId, controller);

      if (isEditMode && (parentMsg?.imageUrl || hasUploadedImages)) {
        // 图生图模式
        // 获取原始 Prompt（如果有父消息）
        const originalPrompt = parentMsg?.editChain
          ? parentMsg.editChain.currentFullPrompt || parentMsg.editChain.fullPrompt
          : (parentMsg?.content || '');

        // 调用图像编辑 API
        const formData = new FormData();
        formData.append('model', selectedModel);
        formData.append('prompt', normalizedPrompt); // 用户输入的修改指令（若为 JSON 则转文本）
        if (originalPrompt) {
          formData.append('originalPrompt', originalPrompt); // 原始完整 Prompt（如果有）
        }
        formData.append('size', finalSize);
        formData.append('n', '1');

        // 获取图片：优先使用上传的图片，否则使用父消息的图片
        if (hasUploadedImages && uploadedImages!.length > 0) {
          // 如果上传了多张图，只使用第一张作为主图
          // TODO: 未来可以支持多图融合或批量处理
          formData.append('image', uploadedImages[0]);

          // 如果有多张图，提示用户
          if (uploadedImages.length > 1) {
            toast(`已上传 ${uploadedImages.length} 张图片，当前使用第一张进行编辑`, { icon: 'ℹ️' });
          }
        } else if (parentMsg?.imageUrl) {
          const parentBlob = await fetch(parentMsg.imageUrl).then(r => r.blob());
          formData.append('image', parentBlob);
        }

        const response = await httpFetch<{
          data: { url?: string; b64_json?: string }[];
          generatedPrompt?: string;
          originalInput?: string;
        }>(
          '/api/ai/images/edits',
          {
            method: 'POST',
            body: formData,
            signal: controller.signal
          }
        );

        const imageData = response?.data?.[0];
        if (!imageData) {
          throw new Error('未返回图像数据');
        }

        imageUrl = imageData.url ?? (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : '');

        // 使用 API 返回的生成 Prompt 创建编辑链
        const generatedPrompt = response.generatedPrompt || prompt;

        // 只有当存在父消息时才创建编辑链
        if (parentMsg) {
          editChain = createEditChain(parentMsg, prompt, generatedPrompt, assistantMsgId);
        }
        // 如果是上传图片的全新图生图，不创建编辑链（因为没有父消息）
      } else {
        // 文生图模式
        const response = await httpFetch<{ data: { url?: string; b64_json?: string }[] }>(
          '/api/ai/images/generations',
          {
            method: 'POST',
            body: JSON.stringify({
              model: selectedModel,
              prompt: normalizedPrompt,
              size: finalSize,
              n: 1,
              response_format: 'url'
            }),
            signal: controller.signal
          }
        );

        const imageData = response?.data?.[0];
        if (!imageData) {
          throw new Error('未返回图像数据');
        }

        imageUrl = imageData.url ?? (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : '');
      }

      if (!imageUrl) {
        throw new Error('图像数据格式错误');
      }

      // 3. 保存到 IndexedDB (历史记录)
      const { localUrl, historyId } = await addHistory(
        imageUrl,
        isEditMode ? prompt : normalizedPrompt,
        {
          model: selectedModel,
          modelName: models.find(m => m.slug === selectedModel)?.displayName,
          mode: isEditMode ? 'img2img' : 'txt2img',
          size: finalSize,
          // 链接会话：默认将每个对话内的生成串为单链
          threadId: currentConversationId,
          parentHistoryId: parentMsg?.imageId
        }
      );

      // 4. 更新助手消息
      const updatedAssistantMsg: ConversationMessage = {
        ...assistantMsg,
        imageUrl: localUrl,
        imageId: historyId,
        editChain,
        isGenerating: false,
        error: undefined
      };

      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? updatedAssistantMsg : m
      ));

      // 滚动到新生成的图片位置，避免被输入框遮挡
      setTimeout(() => {
        try {
          const node = document.getElementById(`msg-${assistantMsgId}`);
          if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'end' });
          } else if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }
        } catch { }
      }, 50);

      // 保存助手消息到 DB
      await saveMessageToDB(updatedAssistantMsg);

      // 5. 刷新积分余额
      await refreshBalance();
      toast.success('生成成功！');

    } catch (error) {
      console.error('[ConversationView] 生成失败:', error);

      const isAbort = isAbortError(error);

      // 更新错误/取消状态
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? {
            ...m,
            isGenerating: false,
            error: isAbort ? '已取消' : (error instanceof Error ? error.message : '生成失败')
          }
          : m
      ));

      if (isAbort) {
        toast('已取消生成');
      } else {
        toast.error(error instanceof Error ? error.message : '生成失败');
      }
    } finally {
      // 清理控制器
      abortControllersRef.current.delete(assistantMsgId);
    }
  }, [
    ensureLogin,
    selectedModel,
    models,
    messages,
    currentConversationId,
    addHistory,
    refreshBalance,
    saveMessageToDB
  ]);

  // 处理"作为输入"
  const handleUseAsInput = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.imageUrl) {
      toast.error('无效的消息');
      return;
    }

    // 设置父消息ID
    setParentMessageId(messageId);

    // 继承提示词（如果有编辑链，使用最后一步的提示词）
    const inheritPrompt = message.editChain
      ? message.editChain.edits[message.editChain.edits.length - 1]?.prompt || message.content
      : message.content;

    setInheritedPrompt(inheritPrompt);

    toast.success('已加载为输入图，可以继续编辑');
  }, [messages]);

  // 处理发布
  const handlePublish = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.imageUrl) {
      toast.error('无效的消息');
      return;
    }
    setPublishTarget(message);
    setIsPublishOpen(true);
  }, [messages]);

  // 重试失败生成
  const handleRetry = useCallback(async (messageId: string) => {
    const target = messages.find(m => m.id === messageId);
    if (!target) return;
    if (!selectedModel) {
      toast.error('请先选择模型');
      return;
    }
    const opts = {
      size: target.generationParams?.size,
      aspectRatio: target.generationParams?.aspectRatio
    };
    await handleSend(target.content, undefined, opts);
  }, [messages, selectedModel, handleSend]);

  // 处理时间轴节点点击
  const handleTimelineNodeClick = useCallback((messageId: string, nodeId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.editChain) {
      toast.error('无效的消息或编辑链');
      return;
    }

    // 查找节点对应的消息
    let targetMessage: ConversationMessage | undefined;
    let targetPrompt: string;

    if (nodeId === 'base') {
      // 回退到基础节点（初始图片）
      // 查找编辑链的父消息
      targetMessage = messages.find(m => m.id === message.editChain?.parentMessageId);
      targetPrompt = message.editChain.basePrompt;

      if (!targetMessage) {
        // 如果找不到父消息，说明当前消息就是第一张图
        toast.info('当前已经是初始状态');
        return;
      }
    } else {
      // 回退到编辑链中的某个节点
      // nodeId 就是 messageId
      const editIndex = message.editChain.edits.findIndex(e => e.messageId === nodeId);
      if (editIndex === -1) {
        toast.error('节点不存在');
        return;
      }

      targetMessage = messages.find(m => m.id === nodeId);

      // 构建到该节点的完整提示词
      const prompts = [message.editChain.basePrompt];
      for (let i = 0; i <= editIndex; i++) {
        prompts.push(message.editChain.edits[i].prompt);
      }
      targetPrompt = prompts.join(', ');
    }

    if (!targetMessage || !targetMessage.imageUrl) {
      toast.error('找不到目标节点的图片');
      return;
    }

    // 设置为编辑模式
    setParentMessageId(targetMessage.id);
    setInheritedPrompt(targetPrompt);

    // 高亮目标消息并滚动
    try {
      const el = document.getElementById(`msg-${targetMessage.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-blue-500/60', 'rounded-2xl');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-blue-500/60');
        }, 1200);
      }
    } catch { }

    // 稍后滚动到输入区并聚焦
    setTimeout(() => {
      const inputArea = document.querySelector('textarea');
      if (inputArea) {
        (inputArea as HTMLTextAreaElement).focus();
        inputArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 600);

    toast.success(`已回退到节点，可以继续编辑`);
  }, [messages]);



  const historyItems: HistoryItem[] = React.useMemo(() => {
    return messages
      .filter(m => m.role === 'assistant' && m.imageUrl && !m.isGenerating)
      .map(m => ({
        id: m.id,
        url: m.imageUrl!,
        title: m.content,
        timestamp: m.timestamp,
        model: m.generationParams?.modelName,
        size: m.generationParams?.size,
        // 为侧边栏时间轴提供链路信息
        threadId: m.conversationId,
        parentHistoryId: m.editChain?.parentMessageId,
        step: m.editChain ? (m.editChain.edits?.length || 0) + 1 : 1
      }));
  }, [messages]);

  // 自动打开历史画廊：当有新图片生成时
  const prevHistoryLength = useRef(0);
  useEffect(() => {
    if (historyItems.length > prevHistoryLength.current) {
      setShowHistory(true);
    }
    prevHistoryLength.current = historyItems.length;
  }, [historyItems.length]);

  const isHistoryOpen = historyItems.length > 0;





  const handleHistoryDownload = useCallback(async (item: HistoryItem) => {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aigc-${item.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('下载成功');
    } catch (error) {
      console.error(error);
      toast.error('下载失败');
    }
  }, []);

  const handleHistoryEdit = useCallback((item: HistoryItem) => {
    const message = messages.find(m => m.id === item.id);
    if (message) {
      handleUseAsInput(item.id);
      toast.success('已加载到编辑模式');
    }
  }, [messages, handleUseAsInput]);

  const handleHistoryShare = useCallback((item: HistoryItem) => {
    const message = messages.find(m => m.id === item.id);
    if (message) {
      handlePublish(item.id);
    }
  }, [messages, handlePublish]);

  const handleHistoryDelete = useCallback((item: HistoryItem) => {
    setMessages(prev => prev.filter(m => m.id !== item.id));
    toast.success('已删除');
  }, []);

  // 加载中状态
  if (isLoadingConversation) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">正在恢复对话...</p>
        </div>
      </div>
    );
  }

  const userDisplayName = user?.email ?? '用户';
  const userAvatarInitial = (userDisplayName.trim().charAt(0) || 'U').toUpperCase();

  return (
    <div className="dark:bg-studio-dark h-full bg-app">
      {/* 侧边栏（固定，桌面常显，移动遮罩抽屉） */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={() => { setActiveView('conversation'); void createNewConversation(); }}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user ? { ...user, credits: balance?.credits ?? user.credits } : undefined}
        onShowExplore={() => setActiveView('explore')}
        exploreActive={activeView === 'explore'}
      />

      {/* 主内容区：全高（由 studio 布局控制视口高度） */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden lg:ml-72">
        {/* 顶部工具栏 */}
        <div
          className="flex shrink-0 items-center gap-3 border-b border-default px-4 py-3 transition-all duration-300 sm:px-6"
        >
          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-2 transition-colors hover:bg-surface-2 lg:hidden"
            aria-label="打开侧边栏"
          >
            <svg className="size-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {activeView === 'conversation' ? (
            <ConversationHeader
              models={selectableModels}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          ) : (
            <div className="flex w-full items-center">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-foreground">灵感画廊</span>
                <span className="text-xs text-muted-foreground">精选社区作品与热门风格</span>
              </div>
              <StudioTopBarActions />
            </div>
          )}
        </div>


        {/* 右侧内容区域 */}
        {activeView === 'conversation' ? (
          <div className="flex flex-1 min-h-0 overflow-hidden relative">
            {/* 左侧聊天区域 */}
            <div className="flex flex-1 flex-col min-w-0">
              {/* 消息列表（唯一滚动容器） */}
              <div
                ref={scrollRef}
                className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain"
                style={{ paddingBottom: `${bottomPad}px` }}
              >
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                  <MessageList
                    messages={messages}
                    onUseAsInput={handleUseAsInput}
                    onPublish={handlePublish}
                    onTimelineNodeClick={handleTimelineNodeClick}
                    onRetry={(messageId) => {
                      handleRetry(messageId);
                    }}
                    onCancel={(messageId) => {
                      const ctrl = abortControllersRef.current.get(messageId);
                      if (!ctrl) {
                        const generating = messages.find(m => m.id === messageId && m.isGenerating);
                        const altCtrl = generating ? abortControllersRef.current.get(generating.id) : undefined;
                        (altCtrl || ctrl)?.abort();
                        return;
                      }
                      ctrl.abort();
                    }}
                    onImageLoad={(loadedId) => {
                      const el = scrollRef.current;
                      if (!el) return;
                      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
                      const lastId = messages[messages.length - 1]?.id;
                      if (distance < bottomPad + 200 || loadedId === lastId) {
                        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                      }
                    }}
                    isHistoryOpen={isHistoryOpen && showHistory}
                    userDisplayName={userDisplayName}
                    userAvatarInitial={userAvatarInitial}
                  />
                </div>
              </div>

              {/* 输入区域：吸附底部，保持可见 */}
              <div ref={inputStickyRef} className="sticky bottom-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent pb-safe pt-4">
                <div
                  className="mx-auto max-w-3xl px-4 transition-all duration-300 sm:px-6"
                >
                  <InputArea
                    onSend={handleSend}
                    disabled={!selectedModel || messages.some(m => m.isGenerating)}
                    inheritedPrompt={inheritedPrompt}
                    isEditMode={Boolean(parentMessageId)}
                  />
                </div>
              </div>
            </div>

            {/* 右侧历史画廊区域 (Responsive: Side-by-Side on Desktop, Overlay on Mobile/Tablet) */}
            {isHistoryOpen && showHistory && (
              <div className="fixed inset-0 z-50 flex flex-col bg-background xl:static xl:z-auto xl:w-auto xl:border-l xl:border-border/50 xl:bg-surface-1/50 xl:backdrop-blur-sm xl:flex-shrink-0 xl:shadow-xl xl:flex">
                {/* Mobile Header with Close Button */}
                <div className="flex items-center justify-between border-b border-border p-4 xl:hidden">
                  <span className="font-semibold">生成历史</span>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="rounded-full p-2 hover:bg-accent"
                  >
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <HistoryGalleryView
                  items={historyItems}
                  onUseAsInput={(itemId) => {
                    handleUseAsInput(itemId);
                    // On mobile/tablet, close history after selecting to return to chat
                    if (window.innerWidth < 1280) {
                      setShowHistory(false);
                    }
                  }}
                  onPublish={handlePublish}
                  onDownload={handleHistoryDownload}
                  onDelete={handleHistoryDelete}
                />
              </div>
            )}

            {/* Mobile Floating History Toggle (Draggable) */}
            {isHistoryOpen && !showHistory && (
              <DraggableFab onClick={() => setShowHistory(true)} />
            )}
          </div>
        ) : (
          // 探索视图（灵感画廊）
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain py-6">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              {!exploreInit ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {exploreLoading ? '正在加载...' : '暂无内容'}
                </div>
              ) : (
                <AssetFeed
                  initialItems={exploreInit.items}
                  initialCursor={exploreInit.cursor}
                  initialState={{ type: 'image', sort: 'hot', categoryId: null }}
                  isAuthenticated={isAuthenticated}
                  userCredits={balance?.credits}
                  basePath="/studio"
                  syncUrl={false}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 发布对话框 */}
      <PublishDialog
        open={isPublishOpen}
        message={publishTarget}
        onClose={() => setIsPublishOpen(false)}
        onSuccess={(assetId) => {
          if (!publishTarget) return;
          setMessages(prev => prev.map(m => m.id === publishTarget.id ? { ...m, published: true, assetId } : m));
          setPublishTarget(null);
        }}
      />

      {/* 融合对话框 */}
      <PromptFusionDialog
        open={isFusionOpen}
        basePrompt={fusionBasePrompt}
        assetTitle={fusionAsset?.title || ''}
        coverUrl={fusionAsset?.coverUrl}
        onClose={() => setIsFusionOpen(false)}
        onConfirm={async (userPrompt) => {
          try {
            // 切换到对话视图
            setActiveView('conversation');

            // 调用融合接口
            const res = await httpFetch<{ finalPrompt: string }>(
              '/api/prompt/fuse',
              {
                method: 'POST',
                body: JSON.stringify({ basePrompt: fusionBasePrompt, userPrompt })
              }
            );

            const finalPrompt = res?.finalPrompt || `${fusionBasePrompt}, ${userPrompt}`;
            const size = fusionAsset?.size;
            // 点击融合时再新建一个新对话，避免混入旧对话
            await createNewConversation();
            await handleSend(finalPrompt, undefined, size ? { size } : undefined);
          } catch (e) {
            const finalPrompt = `${fusionBasePrompt}, ${userPrompt}`;
            await createNewConversation();
            await handleSend(finalPrompt);
          } finally {
            setIsFusionOpen(false);
          }
        }}
      />


    </div>
  );
}

function DraggableFab({ onClick }: { onClick: () => void }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Initialize position to bottom-right (simulated)
  // We use fixed positioning with transform, so initial 0,0 is fine if we position via CSS class initially?
  // Actually, let's use style for position.
  // But to avoid hydration mismatch, we might need to wait for mount.
  // Simpler: Use fixed bottom-24 right-4 as base, and transform for drag.

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: clientX, y: clientY };
    initialPosRef.current = { ...position };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMovedRef.current = true;
    }

    setPosition({
      x: initialPosRef.current.x + dx,
      y: initialPosRef.current.y + dy
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchEnd = () => handleEnd();
    const onMouseUp = () => handleEnd();

    if (isDragging) {
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return (
    <button
      onClick={() => {
        if (!hasMovedRef.current) onClick();
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none'
      }}
      className="fixed bottom-32 right-4 z-30 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg xl:hidden transition-shadow hover:shadow-xl active:scale-95 active:cursor-grabbing cursor-grab"
    >
      <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>
  );
}

export default ConversationView;
