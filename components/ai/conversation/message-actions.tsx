'use client';

import React from 'react';

interface MessageActionsProps {
  onDownload: () => void;
  onPublish: () => void;
  onViewPrompt?: () => void;  // 查看 Prompt 回调
  published?: boolean;
  disabled?: boolean;
  hasPrompt?: boolean;  // 是否有 Prompt 可查看
}

export function MessageActions({
  onDownload,
  onPublish,
  onViewPrompt,
  published = false,
  disabled = false,
  hasPrompt = false
}: MessageActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* 查看 Prompt 按钮 */}
      {hasPrompt && onViewPrompt && (
        <button
          onClick={onViewPrompt}
          disabled={disabled}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>🤖 查看 Prompt</span>
        </button>
      )}
      
      {/* 下载按钮 */}
      <button
        onClick={onDownload}
        disabled={disabled}
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
          />
        </svg>
        <span>下载</span>
      </button>

      {/* 发布按钮 */}
      <button
        onClick={onPublish}
        disabled={disabled || published}
        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${
          published
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
        }`}
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          {published ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
            />
          )}
        </svg>
        <span>{published ? '已发布' : '发布到首页'}</span>
      </button>
    </div>
  );
}

export default MessageActions;
