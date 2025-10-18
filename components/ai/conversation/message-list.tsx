'use client';

import React from 'react';
import MessageItem from './message-item';
import type { ConversationMessage } from '@/types/conversation';

interface MessageListProps {
  messages: ConversationMessage[];
  onUseAsInput: (messageId: string) => void;
  onPublish: (messageId: string) => void;
  onTimelineNodeClick?: (messageId: string, nodeId: string) => void;
}

export function MessageList({
  messages,
  onUseAsInput,
  onPublish,
  onTimelineNodeClick
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4 shadow-xl">
          <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          开始你的创作之旅
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          在下方输入你想要生成的画面描述，AI 会帮你创作出精美的图片。
          <br />
          你还可以对生成的图片进行二次编辑，不断优化直到满意为止！
        </p>
        
        {/* 快速示例 */}
        <div className="mt-8 space-y-2 text-xs text-muted-foreground">
          <p>💡 试试这些提示词：</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-surface-2 rounded-full border border-default">
              一只赛博朋克风格的猫
            </span>
            <span className="px-3 py-1 bg-surface-2 rounded-full border border-default">
              未来主义城市夜景
            </span>
            <span className="px-3 py-1 bg-surface-2 rounded-full border border-default">
              宇宙中的星云
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onUseAsInput={() => onUseAsInput(message.id)}
          onPublish={() => onPublish(message.id)}
          onTimelineNodeClick={
            onTimelineNodeClick
              ? (nodeId) => onTimelineNodeClick(message.id, nodeId)
              : undefined
          }
        />
      ))}
    </div>
  );
}

export default MessageList;
