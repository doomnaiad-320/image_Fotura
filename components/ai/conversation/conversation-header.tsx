'use client';

import React from 'react';
import { Select } from '@/components/ui/select';
import type { ModelOption } from '../playground';

interface ConversationHeaderProps {
  models: ModelOption[];
  selectedModel: string | null;
  onModelChange: (modelSlug: string) => void;
  credits?: number;
}

export function ConversationHeader({
  models,
  selectedModel,
  onModelChange,
  credits
}: ConversationHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-lg border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* 左侧 - 模型选择 */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-sm font-medium text-gray-300">模型</span>
          </div>

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

        {/* 右侧 - 豆余额 */}
        {credits !== undefined && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-orange-400">{credits}</span>
            <span className="text-xs text-orange-500/70">豆</span>
          </div>
        )}
      </div>

      {/* 模型信息提示 */}
      {selectedModel && (
        <div className="mt-2 text-xs text-gray-500">
          {(() => {
            const model = models.find((m) => m.slug === selectedModel);
            if (!model) return null;
            
            const tags = Array.isArray(model.tags) ? model.tags : [];
            if (tags.length === 0) return null;
            
            return (
              <div className="flex items-center gap-2">
                <span>特性:</span>
                <div className="flex gap-1">
                  {tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default ConversationHeader;
