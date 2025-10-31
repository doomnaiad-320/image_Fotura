'use client';

import React, { useState, useMemo } from 'react';
import MessageItem from './message-item';
import type { ConversationMessage } from '@/types/conversation';

interface MessageListProps {
  messages: ConversationMessage[];
  onUseAsInput: (messageId: string) => void;
  onPublish: (messageId: string) => void;
  onTimelineNodeClick?: (messageId: string, nodeId: string) => void;
  onRetry?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
  onImageLoad?: (messageId: string) => void;
}

export function MessageList({
  messages,
  onUseAsInput,
  onPublish,
  onTimelineNodeClick,
  onRetry,
  onCancel,
  onImageLoad
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="mx-auto max-w-4xl w-full py-12">
        <div className="rounded-2xl border border-border bg-card px-8 py-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
            <svg className="h-8 w-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="mb-3 text-xl font-semibold text-foreground">Say it. See it.</h3>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            drop a photo, or click to upload
          </p>
        </div>
      </div>
    );
  }

  const [showAll, setShowAll] = useState(false);
  const MAX = 100;
  const visibleMessages = useMemo(() => (
    showAll ? messages : messages.slice(Math.max(0, messages.length - MAX))
  ), [messages, showAll]);
  const hiddenCount = messages.length - visibleMessages.length;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 sm:px-6">
      {hiddenCount > 0 && !showAll && (
        <div className="sticky top-0 z-10 -mt-2 pt-2">
          <button
            onClick={() => setShowAll(true)}
            className="mx-auto block text-xs px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground"
          >
            展开更早消息（{hiddenCount}）
          </button>
        </div>
      )}
      {visibleMessages.map((message) => (
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
          onRetry={onRetry ? () => onRetry(message.id) : undefined}
          onCancel={onCancel ? () => onCancel(message.id) : undefined}
          onImageLoad={onImageLoad ? () => onImageLoad(message.id) : undefined}
        />
      ))}
    </div>
  );
}

export default MessageList;
