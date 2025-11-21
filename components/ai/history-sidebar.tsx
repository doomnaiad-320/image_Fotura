"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Download, Edit, Share2, Trash2 } from "lucide-react";
import BasePromptInput from "./common/base-prompt-input";
import { Select } from "@/components/ui/select";

// 高级选项预设（与对话页一致）
const RATIO_OPTIONS = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const;
const SIZE_PRESETS: Record<string, string[]> = {
  "1:1": ["512x512", "768x768", "1024x1024"],
  "3:4": ["576x768", "768x1024"],
  "4:3": ["768x576", "1024x768"],
  "9:16": ["720x1280", "864x1536"],
  "16:9": ["1280x720", "1536x864"],
};

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
  onSubmitEdit?: (item: HistoryItem, instruction: string, payload?: { images?: File[]; options?: { size?: string; aspectRatio?: string } }) => void;
  // 俏皮提示配置：在隐藏时显示在右侧固定按钮上
  showPlayfulHint?: boolean;
  playfulHintText?: string;
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
  onItemClick,
  onSubmitEdit,
  showPlayfulHint,
  playfulHintText
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<HistoryItem | null>(null);
  const [confirmStep, setConfirmStep] = useState<number>(0);
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [imageSize, setImageSize] = useState<string>("1024x1024");

  const handleItemClick = (item: HistoryItem) => {
    setSelectedId(item.id);
    onItemClick?.(item);
  };

  return (
    <>
      {/* Sidebar Panel + attached handle */}
      <aside
        className={`fixed right-0 top-0 z-30 h-screen w-[560px] border-l border-default bg-card/95 backdrop-blur-xl will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen
            ? "translate-x-0 shadow-2xl shadow-black/30 animate-in slide-in-from-right fade-in-0"
            : "translate-x-full shadow-none animate-out slide-out-to-right fade-out-0"
        }`}
      >
        {/* 竖排“历史记录”把手，始终吸附在抽屉左侧 */}
        <button
          onClick={onToggle}
          className="history-handle absolute left-0 top-1/2 hidden -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-2xl px-1.5 py-4 text-[11px] backdrop-blur-sm transition-colors lg:flex"
          aria-label={isOpen ? "收起历史记录" : "展开历史记录"}
          title={isOpen ? "收起历史记录" : "展开历史记录"}
        >
          <span
            className="select-none tracking-[0.35em]"
            style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
          >
            历史记录
          </span>
        </button>

        <div
          className={`flex h-full flex-col transform-gpu transition-all duration-500 ease-[cubic-bezier(0.18,0.89,0.32,1.28)] ${
            isOpen
              ? 'opacity-100 translate-x-0 scale-100'
              : 'pointer-events-none opacity-0 translate-x-8 scale-[0.96]'
          }`}
        >
          {/* Header */}
          <div
            className={`relative border-b border-default p-4 transition-all duration-500 ${
              isOpen
                ? 'shadow-[0_12px_24px_rgba(0,0,0,0.18)]/5 animate-in slide-in-from-top-2 fade-in-0'
                : 'opacity-0 -translate-y-1'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                生成历史
              </h3>
              <button
                onClick={onToggle}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-default text-muted-foreground hover:bg-surface"
                aria-label="收起历史记录"
                title="收起"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {items.length > 0 ? `共 ${items.length} 张图片` : "暂无历史记录"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
              点击节点回退并继续编辑，不会删除历史
            </p>
          </div>

          {/* History List */}
          <div
            className={`flex-1 overflow-y-auto p-4 transition-all duration-500 ${
              isOpen
                ? 'animate-in slide-in-from-right-4 fade-in-0 delay-100'
                : 'opacity-0 translate-x-4'
            }`}
          >
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
                                ? 'border-gold bg-surface-2 ring-1 ring-gold/20'
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
<label className="text-[11px] text-muted-foreground mb-1 block">节点提示词</label>
                    <div className="max-h-28 overflow-auto rounded-md bg-surface-2 border border-default p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                      {(confirmItem.title || '').slice(0, 200)}{(confirmItem.title && confirmItem.title.length > 200) ? '…' : ''}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">二次编辑指令</label>
                    <BasePromptInput
                      value={confirmInput}
                      onChange={setConfirmInput}
                      onSubmit={(txt)=>{ onSubmitEdit?.(confirmItem!, txt, { images: uploadedFiles, options: { size: imageSize, aspectRatio } }); setConfirmItem(null); setConfirmInput(""); setUploadedFiles([]); setPreviewUrls([]); }}
                      rowsMin={3}
                      rowsMax={8}
                      autoFocus
                      placeholder="描述需要修改的内容，例如：增强光影，对焦主体，去背景。"
                      className="px-3 py-2 rounded-md bg-surface border border-default"
                    />
                  </div>

                  {/* 图片上传与预览 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        id="sidebar-file-input"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e)=>{
                          const files = Array.from(e.target.files||[]).filter(f=>f.type.startsWith('image/'));
                          if (files.length===0) return;
                          setUploadedFiles(prev=>[...prev, ...files]);
                          files.forEach(file=>{
                            const reader = new FileReader();
                            reader.onload = (ev)=> setPreviewUrls(prev=>[...prev, String(ev.target?.result||'')]);
                            reader.readAsDataURL(file);
                          });
                          e.currentTarget.value='';
                        }}
                      />
                      <button onClick={()=>document.getElementById('sidebar-file-input')?.click()} className="px-2.5 py-1.5 text-xs rounded-md border border-default bg-surface hover:bg-surface-2 text-foreground">上传图片{uploadedFiles.length>0?` (${uploadedFiles.length})`:''}</button>
                      {uploadedFiles.length>0 && (
                        <button onClick={()=>{ setUploadedFiles([]); setPreviewUrls([]); }} className="px-2.5 py-1.5 text-xs rounded-md bg-red-500/15 text-red-500 hover:bg-red-500/25 border border-red-500/30">清空</button>
                      )}
                      <button onClick={()=>setShowAdvanced(s=>!s)} className={`ml-auto px-2.5 py-1.5 text-xs rounded-md border ${showAdvanced? 'bg-orange-500/20 text-orange-500 border-orange-500/30':'bg-surface text-muted-foreground border-default hover:bg-surface-2'}`}>{showAdvanced?'隐藏高级':'高级选项'}</button>
                    </div>
                    {previewUrls.length>0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {previewUrls.map((url,idx)=> (
                          <div key={idx} className="relative inline-block rounded-lg overflow-hidden border border-default">
                            <img src={url} alt={`预览${idx+1}`} className="h-16 w-16 object-cover" />
                            <button onClick={()=>{ setUploadedFiles(prev=>prev.filter((_,i)=>i!==idx)); setPreviewUrls(prev=>prev.filter((_,i)=>i!==idx)); }} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAdvanced && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">图片比例</label>
                          <Select value={aspectRatio} onChange={(e)=>{ setAspectRatio(e.target.value); const sizes = SIZE_PRESETS[e.target.value]||[]; if (sizes.length>0) setImageSize(sizes[0]); }} className="w-full bg-surface border-default px-2 py-1.5 text-sm">
                            {RATIO_OPTIONS.map(r=> (<option key={r} value={r}>{r}</option>))}
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">图像尺寸</label>
                          <Select value={imageSize} onChange={(e)=>setImageSize(e.target.value)} className="w-full bg-surface border-default px-2 py-1.5 text-sm">
                            {(SIZE_PRESETS[aspectRatio]||[]).map(s=> (<option key={s} value={s}>{s}</option>))}
                          </Select>
                        </div>
                      </div>
                    )}
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
                  onClick={() => { onSubmitEdit?.(confirmItem!, confirmInput, { images: uploadedFiles, options: { size: imageSize, aspectRatio } }); setConfirmItem(null); setConfirmInput(""); setUploadedFiles([]); setPreviewUrls([]); }}
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
