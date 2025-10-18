'use client';

import React, { useState } from 'react';
import MessageActions from './message-actions';
import EditChainTimeline from './edit-chain-timeline';
import ImageLightbox from './image-lightbox';
import type { ConversationMessage } from '@/types/conversation';

interface MessageItemProps {
  message: ConversationMessage;
  onUseAsInput: () => void;
  onPublish: () => void;
  onTimelineNodeClick?: (nodeId: string) => void;
}

export function MessageItem({
  message,
  onUseAsInput,
  onPublish,
  onTimelineNodeClick
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const [showLightbox, setShowLightbox] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false); // 控制 Prompt 弹窗

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

  return (
    <div
      className={`flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* 助手头像 */}
      {isAssistant && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}

      {/* 消息内容 - ChatGPT 风格：用户消息限制 70%，AI 消息全宽 */}
      <div
        className={`${
          isUser 
            ? 'max-w-[70%] bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
            : 'flex-1 bg-gray-800/80 backdrop-blur-sm text-gray-100 border border-white/5'
        } rounded-2xl shadow-lg`}
      >
        {/* 文本内容 */}
        <div className="px-4 py-3">
          {/* 用户输入 */}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* 图片结果 (仅助手消息) */}
        {isAssistant && message.imageUrl && (
          <div className="px-4 pb-4 space-y-3">
            {/* 图片 */}
            <div 
              className="relative rounded-lg overflow-hidden border border-white/10 shadow-xl group cursor-pointer"
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
                className="w-full transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* 悬浮提示 */}
              {!message.isGenerating && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-2 text-white">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    <span className="text-sm font-medium">点击放大查看</span>
                  </div>
                </div>
              )}
              
              {/* 图片加载遮罩 */}
              {message.isGenerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-white">正在生成...</p>
                  </div>
                </div>
              )}
            </div>

            {/* 编辑链时间轴 */}
            {message.editChain && (
              <EditChainTimeline
                editChain={message.editChain}
                onNodeClick={onTimelineNodeClick}
              />
            )}

            {/* 操作按钮 */}
            {!message.isGenerating && (
              <MessageActions
                onDownload={handleDownload}
                onPublish={onPublish}
                onViewPrompt={() => setShowPromptModal(true)}
                hasPrompt={!!promptText}
                published={message.published}
                disabled={message.isGenerating}
              />
            )}
          </div>
        )}

        {/* 错误提示 */}
        {message.error && (
          <div className="px-4 pb-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">生成失败</p>
                <p className="text-xs text-red-300 mt-1">{message.error}</p>
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
            <div className="flex items-center gap-3 text-gray-400">
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

      {/* 用户头像 */}
      {isUser && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
      
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowPromptModal(false)}
        >
          <div 
            className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gray-800/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">AI 生成的完整 Prompt</h3>
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
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="复制到剪贴板"
                >
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {/* 关闭按钮 */}
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="关闭"
                >
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <pre className={`text-sm leading-relaxed whitespace-pre-wrap ${
                isJSON(promptText) 
                  ? 'text-green-300 font-mono' 
                  : 'text-gray-300'
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
