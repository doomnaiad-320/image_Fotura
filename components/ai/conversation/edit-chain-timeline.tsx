'use client';

import React, { useState } from 'react';
import type { EditChain } from '@/types/conversation';
import { getChainTimeline } from '@/lib/ai/prompt-chain';

interface EditChainTimelineProps {
  editChain: EditChain;
  onNodeClick?: (nodeId: string) => void;
  currentNodeId?: string; // 当前活跃节点
}

export function EditChainTimeline({ editChain, onNodeClick, currentNodeId }: EditChainTimelineProps) {
  const timeline = getChainTimeline(editChain);
  const [confirmingNodeId, setConfirmingNodeId] = useState<string | null>(null);

  if (timeline.length <= 1) {
    // 只有基础节点，不显示时间轴
    return null;
  }

  const handleNodeClick = (nodeId: string, index: number) => {
    if (!onNodeClick) return;
    
    // 如果点击的是最后一个节点，不需要回退
    if (index === timeline.length - 1) {
      return;
    }
    
    // 显示确认对话框
    setConfirmingNodeId(nodeId);
  };

  const confirmRollback = () => {
    if (confirmingNodeId && onNodeClick) {
      onNodeClick(confirmingNodeId);
      setConfirmingNodeId(null);
    }
  };

  const cancelRollback = () => {
    setConfirmingNodeId(null);
  };

  // 尝试格式化 JSON
  const formatPrompt = (prompt: string) => {
    try {
      const parsed = JSON.parse(prompt);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return prompt; // 不是 JSON，返回原文
    }
  };

  // 判断是否是 JSON
  const isJSON = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>编辑链</span>
        </div>
        
        {onNodeClick && (
          <div className="text-xs text-gray-500">
            点击节点可回退
          </div>
        )}
      </div>

      {/* 水平时间轴 - 隐藏滚动条 */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-2" 
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none' 
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {timeline.map((node, index) => (
          <React.Fragment key={node.id}>
            {/* 节点 */}
            <button
              onClick={() => handleNodeClick(node.id, index)}
              disabled={!onNodeClick || index === timeline.length - 1}
              className={`flex-shrink-0 group relative ${
                onNodeClick && index < timeline.length - 1 ? 'cursor-pointer' : 'cursor-default'
              }`}
              title={node.prompt}
            >
              {/* 节点圆圈 - 减小尺寸 */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 ${
                  node.id === currentNodeId
                    ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-500/30 animate-pulse'
                    : node.isBase
                    ? 'bg-blue-500 border-blue-400 text-white'
                    : index === timeline.length - 1
                    ? 'bg-orange-500 border-orange-400 text-white ring-2 ring-orange-500/30'
                    : 'bg-gray-700 border-gray-600 text-gray-300'
                } ${
                  onNodeClick && index < timeline.length - 1
                    ? 'group-hover:scale-110 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-blue-500/50 group-hover:border-blue-400'
                    : ''
                }`}
              >
                {node.isBase ? '🎨' : index}
              </div>
              
              {/* 状态标签 - 减小尺寸 */}
              {index === timeline.length - 1 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}

              {/* 节点标签 */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs text-gray-500">{node.label}</span>
              </div>

              {/* Tooltip (悬浮提示) */}
              {onNodeClick && index < timeline.length - 1 && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 animate-in fade-in duration-200">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-xl border border-blue-500/50">
                    <div className="flex items-start gap-2 mb-1">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                      </svg>
                      <div>
                        <p className="font-medium mb-1">点击回退到此节点</p>
                        <p className="line-clamp-2 opacity-90">{node.prompt}</p>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-blue-600"></div>
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

      
      {/* 确认对话框 */}
      {confirmingNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6 max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  确认回退到此节点？
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  回退后，当前图片将被替换为该节点的图片，你可以从这里继续编辑。
                </p>
                
                <div className="bg-gray-900/50 rounded-lg p-3 mb-4 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">节点提示词:</p>
                  <p className="text-xs text-gray-300">
                    {timeline.find(n => n.id === confirmingNodeId)?.prompt}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={cancelRollback}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmRollback}
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                  >
                    确认回退
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default EditChainTimeline;
