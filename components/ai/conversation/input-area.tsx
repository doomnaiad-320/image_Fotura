'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface InputAreaProps {
  onSend: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inheritedPrompt?: string;
  isEditMode?: boolean;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (正方形)' },
  { value: '3:4', label: '3:4 (竖屏)' },
  { value: '4:3', label: '4:3 (横屏)' },
  { value: '9:16', label: '9:16 (手机竖屏)' },
  { value: '16:9', label: '16:9 (宽屏)' }
];

const SIZE_PRESETS: Record<string, string[]> = {
  '1:1': ['512x512', '768x768', '1024x1024'],
  '3:4': ['576x768', '768x1024'],
  '4:3': ['768x576', '1024x768'],
  '9:16': ['720x1280', '864x1536'],
  '16:9': ['1280x720', '1536x864']
};

export function InputArea({
  onSend,
  disabled = false,
  placeholder = '描述你想要的画面，例如：一只赛博朋克风格的猫...',
  inheritedPrompt,
  isEditMode = false
}: InputAreaProps) {
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [isFocused, setIsFocused] = useState(false);
  const [customHeight, setCustomHeight] = useState(48);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(48);

  // 继承提示词
  useEffect(() => {
    if (inheritedPrompt) {
      setPrompt(inheritedPrompt);
      textareaRef.current?.focus();
    }
  }, [inheritedPrompt]);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current && !isDragging) {
      textareaRef.current.style.height = 'auto';
      const contentHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(Math.min(contentHeight, 600), customHeight);
      setCustomHeight(newHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [prompt, customHeight, isDragging]);

  // 更新尺寸选项
  useEffect(() => {
    const sizes = SIZE_PRESETS[aspectRatio] || [];
    if (sizes.length > 0 && !sizes.includes(selectedSize)) {
      setSelectedSize(sizes[0]);
    }
  }, [aspectRatio, selectedSize]);

  const handleSubmit = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || disabled) return;

    onSend(trimmedPrompt);
    setPrompt('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 拖动处理
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartHeight.current = customHeight;
    e.preventDefault();
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    const newHeight = Math.min(Math.max(dragStartHeight.current + deltaY, 48), 600);
    
    setCustomHeight(newHeight);
    if (textareaRef.current) {
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
      const handleTouchMove = (e: TouchEvent) => handleDragMove(e);
      const handleMouseUp = () => handleDragEnd();
      const handleTouchEnd = () => handleDragEnd();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const sizeOptions = SIZE_PRESETS[aspectRatio] || [];

  return (
    <div className="relative">
      {/* 渐变遮罩层 */}
      <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-app to-transparent pointer-events-none"></div>
      
      {/* 输入区容器 */}
      <div className="bg-app py-4 sm:py-6">
        <div className="space-y-3">
        {/* 编辑模式提示 */}
        {isEditMode && inheritedPrompt && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 dark:border-orange-500/20">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="text-xs text-orange-400 dark:text-orange-300 font-medium">基于上一张图片继续编辑</span>
            <button
              onClick={() => setPrompt('')}
              className="ml-auto flex-shrink-0 p-1 hover:bg-orange-500/20 rounded transition-colors"
              title="清空继承的提示词"
            >
              <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 主输入容器 */}
        <div
          className={`relative rounded-2xl bg-surface-2/80 border-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] transition-all duration-200 ${
            isFocused
              ? 'border-orange-500 shadow-[0_-8px_24px_rgba(251,146,60,0.15)] dark:shadow-[0_-8px_24px_rgba(251,146,60,0.2)]'
              : 'border-default hover:border-default/80 hover:shadow-[0_-6px_20px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_-6px_20px_rgba(0,0,0,0.35)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* 拖动手柄 */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={`absolute top-0 left-0 right-0 h-5 flex items-center justify-center cursor-ns-resize group rounded-t-2xl transition-all ${
              isDragging 
                ? 'bg-orange-500/15 border-b border-orange-500/30' 
                : 'hover:bg-surface-2'
            }`}
            title="拖动调整高度"
          >
            {/* 拖动图标 - 上下箭头 */}
            <div className={`flex items-center justify-center transition-all ${
              isDragging 
                ? 'opacity-70 scale-110' 
                : 'opacity-30 group-hover:opacity-60'
            }`}>
              <svg 
                className="w-4 h-4 text-muted-foreground" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2.5} 
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" 
                />
              </svg>
            </div>
            
            {/* 文字提示 - 悬停时显示 */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-surface border border-default text-[11px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg flex items-center gap-1.5">
              <svg 
                className="w-3 h-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" 
                />
              </svg>
              <span>拖动调整高度</span>
            </div>
          </div>

          {/* 输入框 */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            style={{ height: `${customHeight}px`, minHeight: '48px', maxHeight: '600px' }}
            className="w-full resize-none bg-transparent px-4 sm:px-5 pt-7 pb-3 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
          />

          {/* 底部工具栏 */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pb-3 pt-1">
            {/* 左侧工具 */}
            <div className="flex items-center gap-2">
              {/* 高级选项按钮 */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  showAdvanced
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                }`}
                title="高级选项"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="hidden sm:inline">高级</span>
              </button>

              {/* 字符计数 */}
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {prompt.length > 0 && `${prompt.length} 字符`}
              </span>
            </div>

            {/* 右侧：快捷键提示 + 发送按钮 */}
            <div className="flex items-center gap-3">
              {/* 快捷键提示 */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-default font-mono text-[10px] text-foreground">⌘</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-default font-mono text-[10px] text-foreground">↵</kbd>
              </div>

              {/* 发送按钮 */}
              <button
                onClick={handleSubmit}
                disabled={disabled || !prompt.trim()}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl font-medium text-sm transition-all ${
                  disabled || !prompt.trim()
                    ? 'bg-surface-2 text-muted-foreground cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 text-primary-foreground hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-95'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden sm:inline">发送</span>
              </button>
            </div>
          </div>
        </div>

          {/* 高级选项面板 */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-surface-2/50 border border-default animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  图片比例
                </label>
                <Select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-surface border-default hover:border-default/60"
                >
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  图像尺寸
                </label>
                <Select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full bg-surface border-default hover:border-default/60"
                >
                  {sizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InputArea;
