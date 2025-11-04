"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Download, Edit, Share2, Trash2 } from "lucide-react";

export type HistoryItem = {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  model?: string;
  size?: string;
  // 可选：链路信息（用于时间轴）
  threadId?: string;
  parentHistoryId?: string;
  step?: number;
};

type Props = {
  items: HistoryItem[];
  isOpen: boolean;
  onToggle: () => void;
  onDownload?: (item: HistoryItem) => void;
  onEdit?: (item: HistoryItem) => void;
  onShare?: (item: HistoryItem) => void;
  onDelete?: (item: HistoryItem) => void;
  onItemClick?: (item: HistoryItem) => void;
};

// 根据 parentHistoryId 向上回溯构建当前项的编辑链（基础 -> 当前）
function buildChain(all: HistoryItem[], current: HistoryItem): HistoryItem[] {
  if (!all || all.length === 0) return [current];
  const byId = new Map(all.map(i => [i.id, i] as const));
  const chain: HistoryItem[] = [];
  let node: HistoryItem | undefined = current;
  let guard = 0;
  while (node && guard < 1000) {
    chain.unshift(node);
    if (!node.parentHistoryId) break;
    const parent = byId.get(node.parentHistoryId);
    if (!parent) break;
    node = parent;
    guard++;
  }
  return chain;
}

function buildChainsFromList(all: HistoryItem[]): HistoryItem[][] {
  const byId = new Map(all.map(i => [i.id, i] as const));
  const groups = new Map<string, HistoryItem[]>();
  const getRootKey = (item: HistoryItem): string => {
    if (item.threadId) return `thread:${item.threadId}`;
    let cur: HistoryItem | undefined = item;
    let parent: HistoryItem | undefined;
    let guard = 0;
    while (cur && cur.parentHistoryId && guard < 1000) {
      parent = byId.get(cur.parentHistoryId);
      if (!parent) break;
      cur = parent;
      guard++;
    }
    return `root:${cur?.id || item.id}`;
  };
  for (const item of all) {
    const key = getRootKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const chains: HistoryItem[][] = [];
  for (const list of groups.values()) {
    const unique = Array.from(new Map(list.map(i => [i.id, i] as const)).values());
    unique.sort((a, b) => (a.step ?? 0) - (b.step ?? 0) || a.timestamp - b.timestamp);
    chains.push(unique);
  }
  chains.sort((a, b) => {
    const ta = a[a.length - 1]?.timestamp || 0;
    const tb = b[b.length - 1]?.timestamp || 0;
    return tb - ta;
  });
  return chains;
}

export function HistorySidebar({
  items,
  isOpen,
  onToggle,
  onDownload,
  onEdit,
  onShare,
  onDelete,
  onItemClick
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleItemClick = (item: HistoryItem) => {
    setSelectedId(item.id);
    onItemClick?.(item);
  };

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={onToggle}
          aria-label="关闭历史记录"
        />
      )}

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl border border-r-0 border-white/10 bg-black/50 p-2 backdrop-blur-sm transition-all hover:bg-black/70 ${
          isOpen ? "translate-x-0" : "translate-x-0"
        }`}
        style={{ right: isOpen ? "560px" : "0" }}
        aria-label={isOpen ? "收起历史记录" : "展开历史记录"}
      >
        <ChevronRight
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-0" : "rotate-180"}`}
        />
      </button>

      {/* Sidebar Panel */}
      <aside
        className={`fixed right-0 top-0 z-30 h-screen w-[560px] border-l border-white/10 bg-black/40 backdrop-blur-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-white/10 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              生成历史
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {items.length > 0 ? `共 ${items.length} 张图片` : "暂无历史记录"}
            </p>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-xs text-gray-500">
                  生成的图片会显示在这里
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {buildChainsFromList(items).map((chain) => (
                  <div key={chain[0]?.id || Math.random()} className="space-y-4">
                    {chain.map((item, idx) => {
                      const isSelected = selectedId === item.id;
                      return (
                        <div key={item.id} className="flex items-stretch gap-3">
                          {/* 竖向时间轴 */}
                          <div className="w-8 flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                              idx === chain.length - 1
                                ? 'bg-orange-500 text-white border-orange-400 ring-2 ring-orange-500/30'
                                : 'bg-white/5 text-gray-300 border-white/10'
                            }`}>
                              {item.step ?? (idx + 1)}
                            </div>
                            {idx < chain.length - 1 && (
                              <div className="flex-1 w-0.5 bg-white/10"></div>
                            )}
                          </div>
                          {/* 节点卡片 */}
                          <div
                            className={`group flex-1 flex gap-3 rounded-xl border p-2 transition-all ${
                              isSelected
                                ? 'border-white/30 bg-white/5'
                                : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                            }`}
                          >
                            {/* Left: Thumbnail */}
                            <button
                              onClick={() => (onEdit ? onEdit(item) : handleItemClick(item))}
                              className="shrink-0 overflow-hidden rounded-lg"
                            >
                              <img
                                src={item.url}
                                alt={item.title}
                                className="h-20 w-20 object-cover transition-transform group-hover:scale-105"
                              />
                            </button>
                            {/* Right: Info & Actions */}
                            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-xs text-gray-300">{item.title}</p>
                                {(item.model || item.size) && (
                                  <p className="mt-1 truncate text-xs text-gray-500">
                                    {item.model}
                                    {item.model && item.size && ' · '}
                                    {item.size}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {onDownload && (
                                  <Button variant="secondary" size="sm" onClick={() => onDownload(item)} className="flex-1 px-2" title="下载">
                                    <Download className="h-3 w-3" />
                                  </Button>
                                )}
                                {onEdit && (
                                  <Button variant="secondary" size="sm" onClick={() => onEdit(item)} className="flex-1 px-2" title="编辑">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                {onShare && (
                                  <Button variant="secondary" size="sm" onClick={() => onShare(item)} className="flex-1 px-2" title="分享">
                                    <Share2 className="h-3 w-3" />
                                  </Button>
                                )}
                                {onDelete && (
                                  <Button variant="secondary" size="sm" onClick={() => onDelete(item)} className="flex-1 px-2 !bg-red-500/10 !text-red-500 hover:!bg-red-500/20 border-red-500/20" title="删除">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
