'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';

import ConversationHeader from './conversation-header';
import ConversationSidebar from './conversation-sidebar';
import MessageList from './message-list';
import InputArea from './input-area';
import PromptFusionDialog from './prompt-fusion-dialog';
import type { ConversationMessage, Conversation, PublishResponse } from '@/types/conversation';
import type { ModelOption } from '../playground';
import { httpFetch } from '@/lib/http';
import { createEditChain, generateConversationTitle } from '@/lib/ai/prompt-chain';
import { useLocalHistory } from '@/lib/hooks/useLocalHistory';
import { getConversationDB, isConversationDBSupported } from '@/lib/storage/conversation-db';
import { imageBlobStore } from '@/lib/storage/image-blob';
import PublishDialog from './publish-dialog';
import { AssetFeed } from '@/components/asset/asset-feed';
import type { AssetListItem, AssetListResponse } from '@/lib/assets';
import { HistorySidebar, type HistoryItem } from '../history-sidebar';

interface ConversationViewProps {
  models: ModelOption[];
  isAuthenticated: boolean;
  user?: { email: string; credits: number; role: string; };
}

const fetcher = (url: string) => httpFetch<any>(url);

export function ConversationView({ models, isAuthenticated, user }: ConversationViewProps) {
  // 状态管理
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  type RightView = 'conversation' | 'explore';
  const [activeView, setActiveView] = useState<RightView>('conversation');
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('conversation-history-sidebar-open');
    return saved ? JSON.parse(saved) : false;
  });
  const [historyWasManuallyHidden, setHistoryWasManuallyHidden] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('conversation-history-manual-hidden');
    return saved ? JSON.parse(saved) : false;
  });
  const historyAutoOpenedRef = React.useRef(false);
  
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
              const matchedModel = models.find(m => m.slug === prefillData.modelSlug);
              if (matchedModel) {
                setSelectedModel(prefillData.modelSlug);
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
  }, [models]);

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
          
          // 恢复最后使用的模型
          if (lastConv.lastActiveModel) {
            setSelectedModel(lastConv.lastActiveModel);
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
      
      // 恢复模型选择
      if (conv.lastActiveModel) {
        setSelectedModel(conv.lastActiveModel);
      }
      
      console.log('[ConversationView] 已切换到对话:', conversationId);
    } catch (error) {
      console.error('[ConversationView] 切换对话失败:', error);
      toast.error('切换对话失败');
    }
  }, [dbSupported, currentConversationId]);

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
      const walk = (val: any, path: string[]) => {
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
          for (const k of Object.keys(val)) walk(val[k], [...path, k]);
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
        } catch {}
      }, 50);
      
      // 保存助手消息到 DB
      await saveMessageToDB(updatedAssistantMsg);

      // 5. 刷新积分余额
      await refreshBalance();
      toast.success('生成成功！');

    } catch (error) {
      console.error('[ConversationView] 生成失败:', error);
      
      const isAbort = (error as any)?.name === 'AbortError';

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
    parentMessageId,
    messages,
    currentConversationId,
    addHistory,
    refreshBalance,
    isAuthenticated
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
        el.classList.add('ring-2','ring-blue-500/60','rounded-2xl');
        setTimeout(() => {
          el.classList.remove('ring-2','ring-blue-500/60');
        }, 1200);
      }
    } catch {}

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

  // 历史侧边栏功能
  const handleToggleHistory = useCallback(() => {
    setIsHistoryOpen((prev) => {
      const next = !prev;
      localStorage.setItem('conversation-history-sidebar-open', JSON.stringify(next));
      // 记录是否用户手动隐藏，用于抑制自动展开
      if (!next) {
        setHistoryWasManuallyHidden(true);
        localStorage.setItem('conversation-history-manual-hidden', 'true');
      } else {
        setHistoryWasManuallyHidden(false);
        localStorage.setItem('conversation-history-manual-hidden', 'false');
      }
      return next;
    });
  }, []);

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

  // 首张图生成后自动展开历史（除非用户手动隐藏过）
  useEffect(() => {
    try {
      if (historyAutoOpenedRef.current) return;
      const count = historyItems.length;
      if (count >= 1 && !historyWasManuallyHidden) {
        setIsHistoryOpen(true);
        historyAutoOpenedRef.current = true;
      }
    } catch {}
  }, [historyItems.length, historyWasManuallyHidden]);

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
      <div className="flex flex-col items-center justify-center h-screen bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">正在恢复对话...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-app dark:bg-studio-dark">
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
      <div className="flex flex-col lg:ml-72 h-full min-h-0 overflow-hidden">
        {/* 顶部工具栏 */}
        <div
          className="border-b border-default shrink-0 flex items-center gap-3 py-3 px-4 sm:px-6 transition-all duration-300"
          style={{ width: isHistoryOpen ? 'calc(100% - 560px)' : undefined }}
        >
          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-surface-2 rounded-lg transition-colors"
            aria-label="打开侧边栏"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {activeView === 'conversation' && (
            <ConversationHeader
              models={models}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              credits={balance?.credits}
              onToggleHistory={handleToggleHistory}
            />
          )}
        </div>

        {/* 右侧内容区域 */}
        {activeView === 'conversation' ? (
          <>
            {/* 消息列表（唯一滚动容器） */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-6 no-scrollbar"
              style={{ paddingBottom: `${bottomPad}px` }}
            >
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
                  // 允许传入的是任意消息ID，但我们存的是助手消息ID；这里直接尝试按该ID取，若为空，再找生成中的助手消息
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
                  // 如果用户本就在底部附近，或加载的是最后一条消息的图片，则滚到底
                  if (distance < bottomPad + 200 || loadedId === lastId) {
                    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                  }
                }}
                isHistoryOpen={isHistoryOpen}
              />
            </div>

            {/* 输入区域：吸附底部，保持可见 */}
            <div ref={inputStickyRef} className="sticky bottom-0 z-20 bg-transparent backdrop-blur-0 supports-[backdrop-filter]:bg-transparent" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div 
                className="max-w-3xl mx-auto px-4 sm:px-6 transition-all duration-300"
                style={{ width: isHistoryOpen ? 'calc(100% - 560px)' : undefined }}
              >
                <InputArea
                  onSend={handleSend}
                  disabled={!selectedModel || messages.some(m => m.isGenerating)}
                  inheritedPrompt={inheritedPrompt}
                  isEditMode={Boolean(parentMessageId)}
                />
              </div>
            </div>
          </>
        ) : (
          // 探索视图
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-6 no-scrollbar">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
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

      {/* 右侧历史侧边栏 */}
      <HistorySidebar
        items={historyItems}
        isOpen={isHistoryOpen}
        onToggle={handleToggleHistory}
        onDownload={handleHistoryDownload}
        onEdit={handleHistoryEdit}
        onShare={handleHistoryShare}
        onDelete={handleHistoryDelete}
        onSubmitEdit={(item, instruction, payload) => {
          // 设置父节点并直接发送
          setParentMessageId(item.id);
          setInheritedPrompt(instruction);
          // 关闭历史并切回对话视图
          setIsHistoryOpen(false);
          setActiveView('conversation');
          void handleSend(instruction, payload?.images, payload?.options);
        }}
        showPlayfulHint={false}
      />
    </div>
  );
}

export default ConversationView;
