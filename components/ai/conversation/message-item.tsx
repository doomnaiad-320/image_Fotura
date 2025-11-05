'use client';

import React, { useState } from 'react';
import ImageLightbox from './image-lightbox';
import type { ConversationMessage } from '@/types/conversation';
import { IterationCw } from 'lucide-react';

interface MessageItemProps {
  message: ConversationMessage;
  onUseAsInput: () => void;
  onPublish: () => void;
  onTimelineNodeClick?: (nodeId: string) => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onImageLoad?: () => void;
}

export function MessageItem({
  message,
  onUseAsInput,
  onPublish,
  onTimelineNodeClick,
  onRetry,
  onCancel,
  onImageLoad,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const [showLightbox, setShowLightbox] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false); // 控制 Prompt 弹窗
  const [jsonCollapsed, setJsonCollapsed] = useState(true);
  const [assistantCollapsed, setAssistantCollapsed] = useState(true);

  // 系统消息（暂时不显示）
  if (message.role === 'system') {
    return null;
  }

  // 尝试格式化 JSON
  const formatPrompt = (prompt: string) => {
    try {
      const parsed = JSON.parse(prompt);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return prompt;
    }
  };

  // 判断是否是 JSON
  const isJSON = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const isContentJSON = isJSON(message.content || '');

  const handleDownload = () => {
    if (!message.imageUrl) return;
    
    const link = document.createElement('a');
    link.href = message.imageUrl;
    link.download = `aigc-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 统一获取要展示/复制的完整 Prompt（兼容旧字段）
  const promptText = message.editChain?.currentFullPrompt ?? message.editChain?.fullPrompt ?? '';

  const timeStr = new Date(message.timestamp).toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const modelName = (message.generationParams?.modelName ?? 'AI').toString();
  const modelInitial = (modelName.trim().charAt(0) || 'A').toUpperCase();

  return (
    <div
      id={`msg-${message.id}`}
      className={`flex animate-in fade-in slide-in-from-bottom-4 duration-300 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
      style={{ contentVisibility: 'auto' as any, containIntrinsicSize: '300px' as any }}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2 w-full`}>
        {/* 头像/名称/时间布局 */}
        {isAssistant ? (
          // AI：icon | (名称+时间) 左右排列，名称与时间为一组且左对齐
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 text-primary-foreground">
              <span className="text-[12px] font-semibold">{modelInitial}</span>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <div className="text-[12px] font-medium text-orange-400 leading-tight">
                {modelName}
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {timeStr}
              </div>
            </div>
          </div>
        ) : (
          <></>
        )}

        {/* 内容区域：用户为气泡，AI 与背景融合；始终位于头像下方 */}
        <div
          className={`${
            isUser
              ? 'max-w-[65%] bg-gradient-to-r from-blue-500 to-blue-600 text-primary-foreground rounded-2xl shadow-lg'
              : 'flex-1 rounded-2xl bg-card/80 text-foreground shadow-none'
          }`}
        >
        {/* 文本内容 */}
        <div className="px-3 py-3 sm:px-4">
          {/* 用户输入/助手生成提示词展示 */}
          {(() => {
            const content = message.content || '';
            let parsed: any = null;
            try {
              const trimmed = content.trim();
              if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && JSON.parse(trimmed)) {
                parsed = JSON.parse(trimmed);
              }
            } catch {}

            // 助手消息：以带背景的卡片展示“提示词”，默认折叠
            if (isAssistant && content) {
              const pretty = parsed ? JSON.stringify(parsed, null, 2) : content;
              return (
                <div className="rounded-xl border border-default bg-surface-2 backdrop-blur p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">提示词</span>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setAssistantCollapsed((v) => !v)}
                      aria-label={assistantCollapsed ? '展开' : '收起'}
                    >
                      {assistantCollapsed ? '展开' : '收起'}
                    </button>
                  </div>
                  <p className={`text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground ${assistantCollapsed ? 'line-clamp-3' : ''}`}>
                    {pretty}
                  </p>
                </div>
              );
            }

            // 用户消息：若为 JSON，采用折叠卡片；否则普通文本
            if (parsed) {
              const pretty = JSON.stringify(parsed, null, 2);
              return (
                <div className="rounded-xl border border-border bg-muted/70 backdrop-blur p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">提示词</span>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setJsonCollapsed((v) => !v)}
                      aria-label={jsonCollapsed ? '展开' : '收起'}
                    >
                      {jsonCollapsed ? '展开' : '收起'}
                    </button>
                  </div>
                  <p className={`text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground ${jsonCollapsed ? 'line-clamp-3' : ''}`}>
                    {pretty}
                  </p>
                </div>
              );
            }

            return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
          })()}
        </div>

        {/* 图片结果 (仅助手消息) */}
        {isAssistant && message.imageUrl && (
          <div className="px-4 pb-4 space-y-3 sm:space-y-4">
            {/* 图片 */}
            <div 
              className="relative rounded-lg overflow-hidden group cursor-pointer bg-transparent w-[68%] sm:w-[60%] lg:w-[52%] mx-auto aspect-square"
              onClick={() => !message.isGenerating && setShowLightbox(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !message.isGenerating) {
                  setShowLightbox(true);
                }
              }}
            >
              <img
                src={message.imageUrl}
                alt="Generated"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                onLoad={() => onImageLoad?.()}
                width={1024}
                height={1024}
              />
              
              {/* 悬浮提示 */}
              {!message.isGenerating && (
                <div className="absolute inset-0 bg-scrim/0 group-hover:bg-scrim transition-colors duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-2 text-primary-foreground">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    <span className="text-sm font-medium">点击放大查看</span>
                  </div>
                </div>
              )}
              
              {/* 图片加载遮罩 */}
              {message.isGenerating && (
                <div className="absolute inset-0 bg-scrim backdrop-blur-sm flex items-center justify-center" role="status" aria-live="polite">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                    <p className="text-sm text-primary-foreground">正在生成...</p>
                    {onCancel && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                        className="mt-1 px-3 py-1.5 text-xs rounded-md bg-orange-500/20 text-white/90 hover:bg-orange-500/30"
                        aria-label="中止生成"
                      >
                        中止
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 重新生成按钮 */}
            {!message.isGenerating && onRetry && (
              <div className="px-4 pt-1">
                <button
                  onClick={() => onRetry()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-default bg-surface hover:bg-surface-2 text-foreground"
                >
                  <IterationCw className="w-3.5 h-3.5" />
                  重新生成
                </button>
              </div>
            )}

            {/* 编辑链时间轴（已隐藏） */}
            {false && message.editChain && (
              <div></div>
            )}

            {/* 操作按钮（已隐藏） */}
            {false && !message.isGenerating && (
              <div></div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {message.error && (
          <div className="px-4 pb-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">生成失败</p>
                <p className="text-xs text-red-300 mt-1 break-all">{message.error}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(message.error || '')}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  aria-label="复制错误信息"
                >
                  复制
                </button>
                <button
                  onClick={() => onRetry?.()}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  aria-label="重试生成"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 已发布标记 */}
        {message.published && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>已发布到首页</span>
            </div>
          </div>
        )}

        {/* 生成中动画 */}
        {isAssistant && message.isGenerating && !message.imageUrl && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm">正在生成图片...</span>
            </div>
          </div>
        )}
        </div>
        {/* 列容器结束 */}
      </div>

      {/* Lightbox 预览 */}
      {showLightbox && message.imageUrl && (
        <ImageLightbox
          imageUrl={message.imageUrl}
          alt={message.content}
          onClose={() => setShowLightbox(false)}
        />
      )}
      
      {/* Prompt 弹窗 */}
      {showPromptModal && promptText && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-sm p-4"
          onClick={() => setShowPromptModal(false)}
        >
          <div 
            className="bg-surface rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-default shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-default bg-surface-2/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-lg font-semibold text-foreground">AI 生成的完整 Prompt</h3>
                {isJSON(promptText) && (
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                    JSON
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* 复制按钮 */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(promptText);
                    // TODO: 显示复制成功提示
                  }}
                  className="p-2 hover:bg-surface-2 rounded-lg transition-colors group"
                  title="复制到剪贴板"
                >
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {/* 关闭按钮 */}
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="p-2 hover:bg-surface-2 rounded-lg transition-colors group"
                  title="关闭"
                >
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <pre className={`text-sm leading-relaxed whitespace-pre-wrap ${
                isJSON(promptText) 
                  ? 'text-green-400 dark:text-green-300 font-mono' 
                  : 'text-foreground'
              }`}>
                {formatPrompt(promptText)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageItem;
