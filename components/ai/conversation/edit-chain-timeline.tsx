'use client';

import React from 'react';
import type { EditChain } from '@/types/conversation';
import { getChainTimeline } from '@/lib/ai/prompt-chain';

interface EditChainTimelineProps {
  editChain: EditChain;
  onNodeClick?: (nodeId: string) => void;
}

export function EditChainTimeline({ editChain, onNodeClick }: EditChainTimelineProps) {
  const timeline = getChainTimeline(editChain);

  if (timeline.length <= 1) {
    // 只有基础节点，不显示时间轴
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>编辑链</span>
      </div>

      {/* 水平时间轴 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {timeline.map((node, index) => (
          <React.Fragment key={node.id}>
            {/* 节点 */}
            <button
              onClick={() => onNodeClick?.(node.id)}
              className={`flex-shrink-0 group relative ${
                onNodeClick ? 'cursor-pointer' : 'cursor-default'
              }`}
              title={node.prompt}
            >
              {/* 节点圆圈 */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 ${
                  node.isBase
                    ? 'bg-blue-500 border-blue-400 text-white'
                    : index === timeline.length - 1
                    ? 'bg-orange-500 border-orange-400 text-white ring-2 ring-orange-500/30'
                    : 'bg-gray-700 border-gray-600 text-gray-300'
                } ${onNodeClick ? 'group-hover:scale-110 group-hover:ring-2 group-hover:ring-orange-500/50' : ''}`}
              >
                {node.isBase ? '🎨' : index}
              </div>

              {/* 节点标签 */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs text-gray-500">{node.label}</span>
              </div>

              {/* Tooltip (悬浮提示) */}
              {onNodeClick && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-xl border border-gray-700">
                    <p className="line-clamp-2">{node.prompt}</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
              )}
            </button>

            {/* 连接线 */}
            {index < timeline.length - 1 && (
              <div className="flex-shrink-0 h-0.5 w-8 bg-gradient-to-r from-gray-600 to-gray-700"></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 完整提示词预览 */}
      <div className="bg-black/30 rounded-lg p-3 border border-white/5">
        <p className="text-xs text-gray-400 mb-1">完整提示词:</p>
        <p className="text-xs text-gray-300 leading-relaxed">{editChain.fullPrompt}</p>
      </div>
    </div>
  );
}

export default EditChainTimeline;
