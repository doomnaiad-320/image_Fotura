'use client';

import React from 'react';
import { Select } from '@/components/ui/select';
import type { ModelOption } from '../playground';
import { useBgTheme } from '@/components/theme/background-provider';

interface ConversationHeaderProps {
  models: ModelOption[];
  selectedModel: string | null;
  onModelChange: (modelSlug: string) => void;
  credits?: number;
  onToggleHistory?: () => void;
}

export function ConversationHeader({
  models,
  selectedModel,
  onModelChange,
  credits,
  onToggleHistory
}: ConversationHeaderProps) {
  const { resolvedTheme, setTheme } = useBgTheme();
  const toggle = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <div className="flex items-center w-full">
      {/* 左侧 - 模型选择 */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">模型</span>

        <Select
          value={selectedModel || ''}
          onChange={(e) => onModelChange(e.target.value)}
          className="flex-1 max-w-xs"
        >
          <option value="" disabled>
            请选择模型...
          </option>
          {models.map((model) => {
            const basePrice =
              model.pricing && model.pricing.unit === 'image'
                ? (model.pricing as any).base
                : null;
            
            return (
              <option key={model.slug} value={model.slug}>
                {model.displayName}
                {basePrice ? ` · ${basePrice}豆/图` : ''}
              </option>
            );
          })}
        </Select>
      </div>

      {/* 右侧 - 余额 + 主题 */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* 历史记录按钮 */}
        <button
          onClick={onToggleHistory}
          className="flex h-8 items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 hover:bg-orange-500/20 transition-colors"
          title="打开生成历史"
        >
          <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-orange-400">历史记录</span>
        </button>

        {/* 分隔线（桌面） */}
        <span className="hidden sm:block h-5 w-px bg-border" />

        {/* 主题 */}
        <button
          onClick={toggle}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
          aria-label="切换主题"
          title="切换主题"
        >
          {resolvedTheme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.293 13.293a8 8 0 11-6.586-6.586 6 6 0 106.586 6.586z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4a1 1 0 011 1v1a1 1 0 11-2 0V5a1 1 0 011-1zm0 13a5 5 0 100-10 5 5 0 000 10zm7-6a1 1 0 110-2h1a1 1 0 110 2h-1zM4 12a1 1 0 110-2H3a1 1 0 110 2h1zm11.657 6.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM6.464 6.464A1 1 0 105.05 7.879l.707.707A1 1 0 107.172 7.172l-.707-.707zm9.9-1.414a1 1 0 011.415 1.415l-.707.707a1 1 0 01-1.415-1.415l.707-.707zM7.879 18.95a1 1 0 10-1.415-1.415l-.707.707a1 1 0 101.415 1.415l.707-.707z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default ConversationHeader;
