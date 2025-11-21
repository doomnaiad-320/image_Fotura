'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import type { Conversation } from '@/types/conversation';
import type { CurrentUser } from '@/lib/auth';
import { UserStar } from 'lucide-react';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, title: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  user?: CurrentUser;
  onShowExplore?: () => void; // 新增：显示探索视图
  exploreActive?: boolean; // 新增：探索是否激活
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
function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onToggle,
  user,
  onShowExplore,
  exploreActive
}: ConversationSidebarProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  const startEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const title = editTitle.trim();
    if (title && onRenameConversation) {
      onRenameConversation(editingId, title);
    }
    setEditingId(null);
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-scrim backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={`fixed top-0 left-0 h-screen bg-surface-2 border-r border-border flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-72`}
      >
        {/* Logo 区域 */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-foreground group-hover:text-orange-400 transition-colors">AIGC Studio</span>
          </Link>
          
          {/* 移动端关闭按钮 */}
          <button
            onClick={onToggle}
            className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="关闭侧边栏"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 顶部：探索按钮 */}
        <div className="p-4 pt-3">
          <button
            onClick={() => {
              onShowExplore?.();
              if (window.innerWidth < 1024) {
                onToggle();
              }
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              exploreActive
                ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15'
                : 'bg-muted text-foreground border-border hover:bg-accent'
            } transition-all`}
            aria-pressed={exploreActive}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m16.24 7.76-3.77 1.01-1.01 3.77 3.77-1.01 1.01-3.77z" />
            </svg>
            <span>灵感画廊</span>
          </button>
          <div className="my-3 border-b border-border" />
        </div>

        {/* 新建对话按钮 */}
        <div className="px-4 pb-4">
          <button
            onClick={() => {
              onNewConversation();
              // 移动端自动关闭侧边栏
              if (window.innerWidth < 1024) {
                onToggle();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-primary-foreground font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新建图片</span>
          </button>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
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
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                      isActive
                        ? 'border-gold bg-surface text-foreground shadow-sm'
                        : 'border-transparent text-muted-foreground hover:border-gold/70 hover:bg-surface-2 hover:text-foreground/90'
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
                    <svg className="w-5 h-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>

                    {/* 内容/重命名 */}
                    <div className="flex-1 min-w-0">
                      {editingId === conv.id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={commitEdit}
                          className="w-full text-xs sm:text-sm rounded-md bg-background border border-input px-2 py-1 text-foreground"
                        />
                      ) : (
                        <>
                          <p className={`truncate font-medium ${isActive ? 'text-[13px] sm:text-sm text-foreground' : 'text-[13px] sm:text-sm text-muted-foreground group-hover:text-foreground'}`}>
                            {conv.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground/80">
                            <span>{conv.imageCount || 0} 张图片</span>
                            <span>•</span>
                            <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    {(isHovered || isActive) && (
                      <div className="flex items-center gap-1">
                        {/* 重命名 */}
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(conv); }}
                          className="flex-shrink-0 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="重命名对话"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`确定删除对话"${conv.title}"吗？`)) {
                              onDeleteConversation(conv.id);
                            }
                          }}
                          className="flex-shrink-0 p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                          aria-label="删除对话"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部用户菜单 */}
        <div className="p-3 border-t border-border">
          {user ? (
            <>
              {/* 用户信息按钮 */}
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group"
              >
                {/* 用户头像 */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-on-accent text-sm font-semibold">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                
                {/* 用户信息 */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">余额: {user.credits} 豆</p>
                </div>
                
                {/* 展开图标 */}
                <svg
                  className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform ${
                    showUserMenu ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* 用户菜单 */}
              {showUserMenu && (
                <div className="mt-2 space-y-1">
                  {/* 导航链接 */}
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    首页
                  </Link>
                  
                  <Link
                    href="/studio"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    创意工作室
                  </Link>
                  
                  <Link
                    href="/me"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                  >
                    <UserStar className="w-4 h-4" />
                    个人主页
                  </Link>
                  
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    设置
                  </Link>
                  
                  {user.role === 'admin' && (
                    <Link
                      href="/admin/ai"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      管理后台
                    </Link>
                  )}
                  
                  <div className="border-t border-border my-2"></div>
                  
                  {/* 退出登录 */}
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    退出登录
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/auth/signin?redirect=/studio"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-orange-500 text-primary-foreground font-medium hover:bg-orange-600 transition-colors"
            >
              登录使用
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export default ConversationSidebar;
