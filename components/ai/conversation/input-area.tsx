'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface InputAreaProps {
  onSend: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inheritedPrompt?: string; // 从"作为输入"继承的提示词
  isEditMode?: boolean; // 是否为编辑模式
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 继承提示词
  useEffect(() => {
    if (inheritedPrompt) {
      setPrompt(inheritedPrompt);
      textareaRef.current?.focus();
    }
  }, [inheritedPrompt]);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

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
    
    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter 发送
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sizeOptions = SIZE_PRESETS[aspectRatio] || [];

  return (
    <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-lg border-t border-white/10 px-4 py-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* 编辑模式提示 */}
        {isEditMode && (
          <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>正在基于上一张图片进行编辑</span>
          </div>
        )}

        {/* 主输入区 */}
        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
          />

          <Button
            onClick={handleSubmit}
            disabled={disabled || !prompt.trim()}
            className="px-6 self-end"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>

        {/* 高级选项 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>高级选项</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>⌘ + Enter 发送</span>
            <span>•</span>
            <span>{prompt.length} 字符</span>
          </div>
        </div>

        {/* 高级选项面板 */}
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <label className="text-xs text-gray-400">图片比例</label>
              <Select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">图像尺寸</label>
              <Select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full"
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
  );
}

export default InputArea;
