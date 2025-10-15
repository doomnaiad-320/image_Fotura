'use client';

import React, { useState } from 'react';
import type { Conversation } from '@/types/conversation';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * 会话列表侧边栏
 * 
 * 功能：
 * - 显示所有对话历史
 * - 新建对话
 * - 切换对话
 * - 删除对话
 * - 移动端响应式（可折叠）
 */
export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onToggle
}: ConversationSidebarProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={`fixed lg:sticky top-0 left-0 h-screen bg-gray-900 border-r border-white/10 flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-72`}
      >
        {/* 顶部工具栏 */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">对话历史</h2>
          
          {/* 移动端关闭按钮 */}
          <button
            onClick={onToggle}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="关闭侧边栏"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 新建对话按钮 */}
        <div className="p-4">
          <button
            onClick={() => {
              onNewConversation();
              // 移动端自动关闭侧边栏
              if (window.innerWidth < 1024) {
                onToggle();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新建图片</span>
          </button>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>暂无对话记录</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isActive = conv.id === currentConversationId;
                const isHovered = hoverId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                    }`}
                    onMouseEnter={() => setHoverId(conv.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      // 移动端自动关闭侧边栏
                      if (window.innerWidth < 1024) {
                        onToggle();
                      }
                    }}
                  >
                    {/* 图标 */}
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs opacity-60">
                        <span>{conv.imageCount || 0} 张图片</span>
                        <span>•</span>
                        <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* 删除按钮 */}
                    {(isHovered || isActive) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定删除对话"${conv.title}"吗？`)) {
                            onDeleteConversation(conv.id);
                          }
                        }}
                        className="flex-shrink-0 p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        aria-label="删除对话"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="p-4 border-t border-white/10 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>共 {conversations.length} 个对话</span>
            {conversations.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('确定清空所有对话记录吗？此操作不可恢复。')) {
                    conversations.forEach(conv => onDeleteConversation(conv.id));
                  }
                }}
                className="hover:text-red-400 transition-colors"
              >
                清空全部
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ConversationSidebar;
