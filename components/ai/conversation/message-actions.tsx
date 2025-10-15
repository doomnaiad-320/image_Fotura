'use client';

import React from 'react';

interface MessageActionsProps {
  onUseAsInput: () => void;
  onDownload: () => void;
  onPublish: () => void;
  published?: boolean;
  disabled?: boolean;
}

export function MessageActions({
  onUseAsInput,
  onDownload,
  onPublish,
  published = false,
  disabled = false
}: MessageActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* 编辑按钮 - 主要操作 */}
      <button
        onClick={onUseAsInput}
        disabled={disabled}
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm hover:from-orange-600 hover:to-orange-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
          />
        </svg>
        <span>编辑</span>
      </button>

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
