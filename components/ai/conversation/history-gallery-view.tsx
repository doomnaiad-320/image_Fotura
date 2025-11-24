'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { HistoryItem } from '../history-sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '../../ui/scroll-area';
import { cn } from '@/lib/utils';
import PromptFusionDialog from './prompt-fusion-dialog';

interface HistoryGalleryViewProps {
    items: HistoryItem[];
    onUseAsInput: (itemId: string) => void;
    onPublish: (itemId: string) => void;
    onDownload: (item: HistoryItem) => void;
    onDelete: (item: HistoryItem) => void;
}

export function HistoryGalleryView({
    items,
    onUseAsInput,
    onPublish,
    onDownload,
    onDelete
}: HistoryGalleryViewProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);

    // Initialize selection with the most recent item
    useEffect(() => {
        if (items.length > 0 && !selectedId) {
            setSelectedId(items[items.length - 1].id); // Select the LAST item (newest) by default if array is chronological? Usually items are appended.
            // Actually, let's check how items are passed. If they are chronological, the last one is newest.
            // Let's assume the user wants to see the latest.
            // But wait, the previous code selected items[0]. Let's stick to items[0] if that's the established pattern, or check logic.
            // In conversation-view, items are mapped from messages. Messages are usually chronological.
            // So items[items.length - 1] would be the latest.
            // However, let's stick to the previous logic for now to avoid breaking changes, or improve it.
            // Previous logic: setSelectedId(items[0].id).
            // If messages are chronological, items[0] is the OLDEST. That seems wrong for a gallery.
            // Let's change it to select the last item (newest).
            setSelectedId(items[items.length - 1].id);
        }
    }, [items, selectedId]);

    const selectedItem = useMemo(
        () => items.find(item => item.id === selectedId) || items[items.length - 1],
        [items, selectedId]
    );

    const [targetWidth, targetHeight] = useMemo(() => {
        if (!selectedItem?.size) return [512, 512];
        const parts = selectedItem.size.split('x').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return [parts[0] / 2, parts[1] / 2];
        }
        return [512, 512];
    }, [selectedItem]);

    if (!selectedItem) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <p>暂无历史记录</p>
            </div>
        );
    }

    return (
        <div
            className="flex h-full flex-col bg-transparent animate-in fade-in duration-300 overflow-hidden w-full lg:w-[var(--gallery-width)]"
            style={{
                '--gallery-width': `${Math.max(targetWidth + 364, 400)}px`
            } as React.CSSProperties}
        >
            {/* Main Content Area (Vertical Layout for Side Pane) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Image Preview Area */}
                <div className="flex-1 bg-muted/30 flex items-center justify-center p-4 relative group min-h-0">
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        style={{ maxWidth: targetWidth, maxHeight: targetHeight }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={selectedItem.url}
                            alt={selectedItem.title}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                    </div>

                    {/* Overlay Actions */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:bg-white/20 rounded-full h-8 px-3 text-xs"
                            onClick={() => onDownload(selectedItem)}
                        >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            下载
                        </Button>
                        <div className="w-px h-3 bg-white/20" />
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:bg-white/20 rounded-full h-8 px-3 text-xs hover:text-red-400"
                            onClick={() => {
                                if (confirm('确定删除这张图片吗？')) {
                                    onDelete(selectedItem);
                                }
                            }}
                        >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            删除
                        </Button>
                    </div>
                </div>

                {/* Info Panel (Compact for Side Pane) */}
                <div className="border-t border-border bg-surface p-4 space-y-4 flex-shrink-0 max-h-[30%] overflow-y-auto">
                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onClick={() => setShowEditDialog(true)}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
                        >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            再次编辑
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => onPublish(selectedItem.id)}
                            className="w-full h-8 text-xs"
                        >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            发布
                        </Button>
                    </div>

                    {/* Prompt */}
                    <div className="space-y-1">
                        <h3 className="text-xs font-medium text-muted-foreground">提示词</h3>
                        <div className="p-2 bg-muted/50 rounded text-xs leading-relaxed break-words max-h-20 overflow-y-auto scrollbar-thin">
                            {selectedItem.title}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Timeline Grid (Wrapped) */}
            <div className="border-t border-border bg-surface-2 flex-shrink-0 max-h-48 overflow-y-auto p-4">
                <div className="flex flex-wrap gap-2 justify-center">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className={cn(
                                "relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all duration-200 group",
                                selectedId === item.id
                                    ? "border-orange-500 ring-2 ring-orange-500/20 scale-105 z-10"
                                    : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"
                            )}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={item.url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            {selectedId === item.id && (
                                <div className="absolute inset-0 bg-orange-500/10 pointer-events-none" />
                            )}

                            {/* 编辑标签 */}
                            <div className={cn(
                                "absolute bottom-0 left-0 right-0 text-[10px] font-medium text-center py-0.5 transition-colors duration-200",
                                selectedId === item.id
                                    ? "bg-orange-500 text-white"
                                    : "bg-black/50 text-white/80 group-hover:bg-black/70"
                            )}>
                                编辑
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 编辑弹窗 */}
            <PromptFusionDialog
                open={showEditDialog}
                basePrompt={selectedItem.title}
                assetTitle={selectedItem.title}
                coverUrl={selectedItem.url}
                onClose={() => setShowEditDialog(false)}
                onConfirm={(userPrompt) => {
                    onUseAsInput(selectedItem.id);
                    setShowEditDialog(false);
                }}
            />
        </div>
    );
}

export default HistoryGalleryView;
