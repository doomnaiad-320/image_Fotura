'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';

import ConversationHeader from './conversation-header';
import ConversationSidebar from './conversation-sidebar';
import MessageList from './message-list';
import InputArea from './input-area';
import type { ConversationMessage, Conversation } from '@/types/conversation';
import type { ModelOption } from '../playground';
import { httpFetch } from '@/lib/http';
import { createEditChain, generateConversationTitle } from '@/lib/ai/prompt-chain';
import { useLocalHistory } from '@/lib/hooks/useLocalHistory';
import { getConversationDB, isConversationDBSupported } from '@/lib/storage/conversation-db';
import { imageBlobStore } from '@/lib/storage/image-blob';

interface ConversationViewProps {
  models: ModelOption[];
  isAuthenticated: boolean;
  user?: { email: string; credits: number; role: string; };
}

const fetcher = (url: string) => httpFetch<any>(url);

export function ConversationView({ models, isAuthenticated, user }: ConversationViewProps) {
  // 状态管理
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState(() => `conv-${Date.now()}`);
  const [parentMessageId, setParentMessageId] = useState<string | null>(null);
  const [inheritedPrompt, setInheritedPrompt] = useState<string>('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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
      setParentMessageId(null);
      setInheritedPrompt('');
      
      // 刷新对话列表
      const allConvs = await db.listConversations(50);
      setConversations(allConvs);
      
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
      
      // 如果删除的是当前对话，创建新对话
      if (conversationId === currentConversationId) {
        await createNewConversation();
      }
      
      toast.success('已删除对话');
    } catch (error) {
      console.error('[ConversationView] 删除对话失败:', error);
      toast.error('删除对话失败');
    }
  }, [dbSupported, currentConversationId, createNewConversation]);

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
  const handleSend = useCallback(async (prompt: string) => {
    if (!ensureLogin()) return;
    
    if (!selectedModel) {
      toast.error('请先选择模型');
      return;
    }

    // 自动持续编辑：找到最后一条 AI 回复作为父消息
    let parentMsg = null;
    let isEditMode = false;
    
    if (messages.length > 0) {
      // 从后往前找最后一条 assistant 消息
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].imageUrl) {
          parentMsg = messages[i];
          isEditMode = true;
          break;
        }
      }
    }

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
        // 图生图模式
        // 获取原始 Prompt（父消息的最终 Prompt）
        const originalPrompt = parentMsg.editChain
          ? parentMsg.editChain.currentFullPrompt || parentMsg.editChain.fullPrompt
          : parentMsg.content;

        // 调用图像编辑 API
        const formData = new FormData();
        formData.append('model', selectedModel);
        formData.append('prompt', prompt); // 用户输入的修改指令
        formData.append('originalPrompt', originalPrompt); // 原始完整 Prompt
        formData.append('size', '1024x1024');
        formData.append('n', '1');

        // 获取父图片
        const parentBlob = await fetch(parentMsg.imageUrl).then(r => r.blob());
        formData.append('image', parentBlob);

        const response = await httpFetch<{ 
          data: { url?: string; b64_json?: string }[]; 
          generatedPrompt?: string;
          originalInput?: string;
        }>(
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
        
        // 使用 API 返回的生成 Prompt 创建编辑链
        const generatedPrompt = response.generatedPrompt || prompt;
        editChain = createEditChain(parentMsg, prompt, generatedPrompt, assistantMsgId);
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
    
    // 滚动到输入区
    setTimeout(() => {
      const inputArea = document.querySelector('textarea');
      if (inputArea) {
        inputArea.focus();
        inputArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    toast.success(`已回退到节点，可以继续编辑`);
  }, [messages]);

  // 加载中状态
  if (isLoadingConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">正在恢复对话...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* 侧边栏 */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user ? { ...user, credits: balance?.credits ?? user.credits } : undefined}
      />

      {/* 主内容区 - 全等宽布局 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 - 全等宽 */}
        <div className="border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 py-3">
              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="打开侧边栏"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <ConversationHeader
                models={models}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                credits={balance?.credits}
              />
            </div>
          </div>
        </div>

        {/* 消息列表 - 完全全宽，0 padding */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain py-6"
        >
          <MessageList
            messages={messages}
            onUseAsInput={handleUseAsInput}
            onPublish={handlePublish}
            onTimelineNodeClick={handleTimelineNodeClick}
          />
        </div>

        {/* 输入区域 - 全等宽 */}
        <div className="border-t border-white/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <InputArea
              onSend={handleSend}
              disabled={!selectedModel || messages.some(m => m.isGenerating)}
              inheritedPrompt={inheritedPrompt}
              isEditMode={Boolean(parentMessageId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationView;
