"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

interface PromptFusionDialogProps {
  open: boolean;
  basePrompt: string;
  assetTitle?: string;
  coverUrl?: string;
  onClose: () => void;
  onConfirm: (userPrompt: string) => Promise<void> | void;
}

export default function PromptFusionDialog({ open, basePrompt, assetTitle, coverUrl, onClose, onConfirm }: PromptFusionDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setUserPrompt("");
      setSubmitting(false);
      setExpanded(false);
    }
  }, [open]);

  if (!open || !mounted) return null;

  const handleSubmit = async () => {
    if (!userPrompt.trim()) {
      toast.error("请输入你想要的效果或修改方向");
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm(userPrompt.trim());
    } catch (e: any) {
      toast.error(e?.message || "融合失败");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-scrim">
      <div className="w-full max-w-2xl bg-surface rounded-2xl border border-default shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-default">
          <h3 className="text-base sm:text-lg font-semibold">基于示例进行二次创作</h3>
          <button
            className="p-3 sm:p-2 rounded-lg hover:bg-surface-2"
            onClick={onClose}
            disabled={submitting}
            aria-label="关闭"
          >
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* 示例预览 */}
          <div className="flex gap-4">
            {coverUrl && (
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-default bg-surface-2 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt={assetTitle || "示例图"} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 space-y-2 min-w-0">
              {assetTitle && <p className="text-sm font-medium truncate">{assetTitle}</p>}
              <div className="rounded-xl border border-default bg-surface-2 p-3">
                <p className={`text-xs leading-relaxed ${expanded ? "line-clamp-none" : "line-clamp-3"}`}>
                  {basePrompt || "(无提示词)"}
                </p>
                {basePrompt && basePrompt.length > 60 && (
                  <button className="mt-2 text-xs text-blue-600 hover:underline" onClick={() => setExpanded(!expanded)}>
                    {expanded ? "收起" : "展开"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 输入框 */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">输入你想要的修改或新想法（例如：改为男性，30岁，户外跑步，清晨阳光）</label>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-default bg-surface-2 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="描述你的需求..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-default">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 min-h-[48px] rounded-xl border border-default bg-surface-2 text-foreground text-base font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 min-h-[48px] rounded-xl bg-orange-600 text-white text-base font-semibold shadow hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{submitting ? "融合中..." : "融合生成"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
