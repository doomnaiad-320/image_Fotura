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
  // 新增：提交二次编辑（会话/工作台实现发送给 AI）
  onSubmitEdit?: (item: HistoryItem, instruction: string) => void;
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
  const [confirmItem, setConfirmItem] = useState<HistoryItem | null>(null);
  const [confirmStep, setConfirmStep] = useState<number>(0);
  const [confirmInput, setConfirmInput] = useState<string>("");

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
        className={`fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl border border-r-0 border-default bg-surface-2 p-2 backdrop-blur-sm transition-all hover:bg-surface ${
          isOpen ? "translate-x-0" : "translate-x-0"
        }`}
        style={{ right: isOpen ? "560px" : "0" }}
        aria-label={isOpen ? "收起历史记录" : "展开历史记录"}
      >
        <ChevronRight
          className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-0" : "rotate-180"}`}
        />
      </button>

      {/* Sidebar Panel */}
      <aside
        className={`fixed right-0 top-0 z-30 h-screen w-[560px] border-l border-default bg-card backdrop-blur-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-default p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              生成历史
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {items.length > 0 ? `共 ${items.length} 张图片` : "暂无历史记录"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
              点击节点回退并继续编辑，不会删除历史
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
                            <div className="relative group">
                              <button
                                onClick={() => { setConfirmItem(item); setConfirmStep(item.step ?? (idx + 1)); }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                                  idx === chain.length - 1
                                    ? 'bg-orange-500 text-white border-orange-400 ring-2 ring-orange-500/30'
                                    : 'bg-surface-2 text-foreground/80 border-default hover:bg-surface'
                                }`}
                                title={`回退到第${(item.step ?? (idx + 1))}步`}
                              >
                                {item.step ?? (idx + 1)}
                              </button>
                              {/* Tooltip */}
                              <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden group-hover:block z-10">
                                <div className="bg-surface text-foreground text-xs rounded-md px-3 py-2 shadow-xl border border-default max-w-xs relative">
                                  <p className="font-medium mb-1">回退到第{item.step ?? (idx + 1)}步</p>
                                  <p className="opacity-80">加载该步图片与提示词为输入，新的生成将成为第{(item.step ?? (idx + 1)) + 1}步。</p>
                                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-surface border-l border-t border-default rotate-45"></div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-[10px] text-gray-500 h-3">
                              {idx === 0 ? '原图' : (idx === chain.length - 1 ? '当前步骤' : '')}
                            </div>
                            {idx < chain.length - 1 && (
                              <div className="flex-1 border-l border-default"></div>
                            )}
                          </div>
                          {/* 节点卡片 */}
                          <div
                            className={`group flex-1 flex gap-3 rounded-xl border p-2 transition-all ${
                              isSelected
                                ? 'border-default bg-surface'
                                : 'border-default bg-surface hover:bg-surface-2'
                            }`}
                          >
                            {/* Left: Thumbnail */}
                              <button
                                onClick={() => { setConfirmItem(item); setConfirmStep(item.step ?? (idx + 1)); }}
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
                                <p className="line-clamp-2 text-xs text-foreground">{item.title}</p>
                                {(item.model || item.size) && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {item.model}
                                    {item.model && item.size && ' · '}
                                    {item.size}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {onDownload && (
                                  <Button variant="secondary" size="sm" onClick={() => onDownload(item)} className="flex-1 px-2 gap-1" title="下载">
                                    <Download className="h-3 w-3" />
                                    <span className="text-xs">下载</span>
                                  </Button>
                                )}
                                {onEdit && (
                                  <Button variant="secondary" size="sm" onClick={() => onEdit(item)} className="flex-1 px-2 gap-1" title="编辑">
                                    <Edit className="h-3 w-3" />
                                    <span className="text-xs">编辑</span>
                                  </Button>
                                )}
                                {onShare && (
                                  <Button variant="secondary" size="sm" onClick={() => onShare(item)} className="flex-1 px-2 gap-1" title="分享">
                                    <Share2 className="h-3 w-3" />
                                    <span className="text-xs">发布</span>
                                  </Button>
                                )}
                                {onDelete && (
                                  <Button variant="secondary" size="sm" onClick={() => onDelete(item)} className="flex-1 px-2 gap-1 !bg-red-500/10 !text-red-500 hover:!bg-red-500/20 border-red-500/20" title="删除">
                                    <Trash2 className="h-3 w-3" />
                                    <span className="text-xs">删除</span>
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

      {/* 回退确认弹窗 */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="bg-card rounded-2xl shadow-2xl border border-default w-[min(680px,92vw)] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-default">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.333 4z"/></svg>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">回退到第{confirmStep}步 <span className="text-[11px] font-normal text-muted-foreground">不会删除历史</span></h3>
              </div>
              <button onClick={() => setConfirmItem(null)} className="p-2 rounded-md hover:bg-surface-2 text-muted-foreground" aria-label="关闭">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                <img src={confirmItem.url} alt="目标缩略图" className="w-44 h-44 rounded-lg object-cover border border-default flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">节点摘要</label>
                    <div className="max-h-28 overflow-auto rounded-md bg-surface-2 border border-default p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                      {(confirmItem.title || '').slice(0, 200)}{(confirmItem.title && confirmItem.title.length > 200) ? '…' : ''}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">二次编辑指令</label>
                    <textarea
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      rows={4}
                      placeholder="描述需要修改的内容，例如：增强光影，对焦主体，去背景。"
                      className="w-full resize-none rounded-md bg-surface border border-default px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-default">
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmItem(null)} className="px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-surface-2">取消</button>
                <button
                  onClick={() => { onEdit ? onEdit(confirmItem) : onItemClick?.(confirmItem); setConfirmItem(null); }}
                  className="px-3 py-2 text-sm rounded-md border border-default bg-surface hover:bg-surface-2 text-foreground"
                >
                  仅加载为输入
                </button>
                <button
                  onClick={() => { onSubmitEdit?.(confirmItem, confirmInput); setConfirmItem(null); setConfirmInput(""); }}
                  disabled={!confirmInput.trim()}
                  className="px-3 py-2 text-sm rounded-md bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  继续编辑并发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
