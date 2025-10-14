'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';

import ConversationHeader from './conversation-header';
import MessageList from './message-list';
import InputArea from './input-area';
import type { ConversationMessage, Conversation } from '@/types/conversation';
import type { ModelOption } from '../playground';
import { httpFetch } from '@/lib/http';
import { createEditChain, generateConversationTitle } from '@/lib/ai/prompt-chain';
import { useLocalHistory } from '@/lib/hooks/useLocalHistory';
import { getConversationDB, isConversationDBSupported } from '@/lib/storage/conversation-db';

interface ConversationViewProps {
  models: ModelOption[];
  isAuthenticated: boolean;
}

const fetcher = (url: string) => httpFetch<any>(url);

export function ConversationView({ models, isAuthenticated }: ConversationViewProps) {
  // 状态管理
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState(() => `conv-${Date.now()}`);
  const [parentMessageId, setParentMessageId] = useState<string | null>(null);
  const [inheritedPrompt, setInheritedPrompt] = useState<string>('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addHistory } = useLocalHistory();
  const dbSupported = isConversationDBSupported();

  // 获取积分余额
  const { data: balance, mutate: refreshBalance } = useSWR(
    isAuthenticated ? '/api/credits/balance' : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

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
          setMessages(msgs);
          
          // 恢复最后使用的模型
          if (lastConv.lastActiveModel) {
            setSelectedModel(lastConv.lastActiveModel);
          }
          
          console.log('[ConversationView] 已恢复', msgs.length, '条消息');
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

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    if (!dbSupported) return;

    try {
      const newConvId = `conv-${Date.now()}`;
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
      setCurrentConversationId(newConvId);
      setMessages([]);
      
      console.log('[ConversationView] 新对话已创建:', newConvId);
    } catch (error) {
      console.error('[ConversationView] 创建对话失败:', error);
      toast.error('创建对话失败');
    }
  }, [dbSupported, selectedModel]);

  // 保存消息到 IndexedDB
  const saveMessageToDB = useCallback(async (message: ConversationMessage) => {
    if (!dbSupported) return;

    try {
      const db = await getConversationDB();
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
  const handleSend = useCallback(async (prompt: string) => {
    if (!ensureLogin()) return;
    
    if (!selectedModel) {
      toast.error('请先选择模型');
      return;
    }

    const isEditMode = Boolean(parentMessageId);
    const parentMsg = parentMessageId
      ? messages.find(m => m.id === parentMessageId)
      : null;

    // 1. 添加用户消息
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
    const assistantMsg: ConversationMessage = {
      id: assistantMsgId,
      conversationId: currentConversationId,
      role: 'assistant',
      content: prompt,
      timestamp: Date.now(),
      isGenerating: true,
      generationParams: {
        model: selectedModel,
        modelName: models.find(m => m.slug === selectedModel)?.displayName || selectedModel,
        size: '1024x1024', // 从 InputArea 传递
        mode: isEditMode ? 'img2img' : 'txt2img',
        aspectRatio: '1:1'
      }
    };
    setMessages(prev => [...prev, assistantMsg]);

    // 重置父消息ID和继承提示词
    setParentMessageId(null);
    setInheritedPrompt('');

    try {
      let imageUrl: string;
      let editChain: ConversationMessage['editChain'];

      if (isEditMode && parentMsg?.imageUrl) {
        // 图生图模式 - 创建编辑链
        editChain = createEditChain(parentMsg, prompt, assistantMsgId);

        // 调用图像编辑 API
        const formData = new FormData();
        formData.append('model', selectedModel);
        formData.append('prompt', editChain.fullPrompt); // 使用完整提示词!
        formData.append('size', '1024x1024');
        formData.append('n', '1');

        // 获取父图片
        const parentBlob = await fetch(parentMsg.imageUrl).then(r => r.blob());
        formData.append('image', parentBlob);

        const response = await httpFetch<{ data: { url?: string; b64_json?: string }[] }>(
          '/api/ai/images/edits',
          {
            method: 'POST',
            body: formData
          }
        );

        const imageData = response?.data?.[0];
        if (!imageData) {
          throw new Error('未返回图像数据');
        }

        imageUrl = imageData.url ?? (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : '');
      } else {
        // 文生图模式
        const response = await httpFetch<{ data: { url?: string; b64_json?: string }[] }>(
          '/api/ai/images/generations',
          {
            method: 'POST',
            body: JSON.stringify({
              model: selectedModel,
              prompt: prompt,
              size: '1024x1024',
              n: 1,
              response_format: 'url'
            })
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
        prompt,
        {
          model: selectedModel,
          modelName: models.find(m => m.slug === selectedModel)?.displayName,
          mode: isEditMode ? 'img2img' : 'txt2img',
          size: '1024x1024'
        }
      );

      // 4. 更新助手消息
      const updatedAssistantMsg: ConversationMessage = {
        ...assistantMsg,
        imageUrl: localUrl,
        imageId: historyId,
        editChain,
        isGenerating: false
      };
      
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? updatedAssistantMsg : m
      ));
      
      // 保存助手消息到 DB
      await saveMessageToDB(updatedAssistantMsg);

      // 5. 刷新积分余额
      await refreshBalance();
      toast.success('生成成功！');

    } catch (error) {
      console.error('[ConversationView] 生成失败:', error);
      
      // 更新错误状态
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? {
              ...m,
              isGenerating: false,
              error: error instanceof Error ? error.message : '生成失败'
            }
          : m
      ));
      
      toast.error(error instanceof Error ? error.message : '生成失败');
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

    // TODO: 打开发布对话框
    toast.info('发布功能将在阶段 3 实现');
    
    // 暂时标记为已发布
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, published: true } : m
    ));
  }, [messages]);

  // 处理时间轴节点点击
  const handleTimelineNodeClick = useCallback((messageId: string, nodeId: string) => {
    // TODO: 实现回退到指定节点的逻辑
    console.log('[Timeline] 点击节点:', messageId, nodeId);
    toast.info('节点回退功能将在阶段 2 实现');
  }, []);

  // 加载中状态
  if (isLoadingConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">正在恢复对话...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gray-950">
      {/* 顶部工具栏 */}
      <ConversationHeader
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        credits={balance?.credits}
      />

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 overscroll-contain"
      >
        <div className="max-w-4xl mx-auto">
          <MessageList
            messages={messages}
            onUseAsInput={handleUseAsInput}
            onPublish={handlePublish}
            onTimelineNodeClick={handleTimelineNodeClick}
          />
        </div>
      </div>

      {/* 输入区域 */}
      <InputArea
        onSend={handleSend}
        disabled={!selectedModel || messages.some(m => m.isGenerating)}
        inheritedPrompt={inheritedPrompt}
        isEditMode={Boolean(parentMessageId)}
      />
    </div>
  );
}

export default ConversationView;
