'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export interface ReuseDialogProps {
  open: boolean;
  assetId: string;
  assetTitle: string;
  reusePoints: number;
  userCredits: number;
  onClose: () => void;
}

export function ReuseDialog({
  open,
  assetId,
  assetTitle,
  reusePoints,
  userCredits,
  onClose
}: ReuseDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setSubmitting(false);
    }
  }, [open]);

  const handleReuse = async () => {
    if (userCredits < reusePoints) {
      toast.error('积分不足，请先充值');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/assets/${assetId}/reuse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '复用失败');
      }

      // 复用成功
      toast.success(data.message || '复用成功！');

      // 将预填数据存储到 localStorage
      if (data.prefillData) {
        localStorage.setItem('reuse_prefill_data', JSON.stringify({
          assetId,
          assetTitle,
          ...data.prefillData,
          timestamp: Date.now()
        }));
      }

      // 跳转到创作面板
      router.push('/studio?prefill=true');
      onClose();
    } catch (error: any) {
      console.error('[ReuseDialog] error:', error);
      toast.error(error.message || '复用失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !mounted) return null;

  const isInsufficientCredits = userCredits < reusePoints;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-scrim">
      <div
        className="w-full max-w-md bg-surface rounded-2xl border border-default shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-default">
          <h3 className="text-base sm:text-lg font-semibold">复用作品</h3>
          <button
            className="p-3 sm:p-2 rounded-lg hover:bg-surface-2 touch-manipulation"
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
          {/* 作品信息 */}
          <div className="rounded-xl border border-default bg-surface-2 p-4">
            <p className="text-sm text-muted-foreground mb-1">复用作品</p>
            <p className="font-medium">{assetTitle}</p>
          </div>

          {/* 积分信息 */}
          <div className="rounded-xl border border-default bg-surface-2 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">复用积分</span>
              <span className="text-lg font-bold text-orange-600">-{reusePoints}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">当前余额</span>
              <span className={`text-lg font-bold ${isInsufficientCredits ? 'text-red-600' : 'text-foreground'}`}>
                {userCredits}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-default">
              <span className="text-sm font-medium">复用后余额</span>
              <span className={`text-lg font-bold ${isInsufficientCredits ? 'text-red-600' : 'text-green-600'}`}>
                {Math.max(0, userCredits - reusePoints)}
              </span>
            </div>
          </div>

          {/* 余额不足警告 */}
          {isInsufficientCredits && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-red-600">
                  <p className="font-medium mb-1">积分不足</p>
                  <p>您需要 {reusePoints} 积分，但当前余额仅 {userCredits}。请先充值。</p>
                </div>
              </div>
            </div>
          )}

          {/* 说明 */}
          <div className="rounded-xl border border-default bg-surface-2 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• 点击确认后将扣除 {reusePoints} 积分</p>
                <p>• 作品的 Prompt 和参数将自动预填到创作面板</p>
                <p>• 首次复用时，原作者将获得 {reusePoints} 积分奖励</p>
                <p>• 重复复用同一作品不会给予原作者奖励</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-default">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 min-h-[48px] rounded-xl border border-default bg-surface-2 text-foreground text-base font-medium touch-manipulation disabled:opacity-60"
          >
            取消
          </button>
          <button
            onClick={handleReuse}
            disabled={submitting || isInsufficientCredits}
            className="flex-1 min-h-[48px] rounded-xl bg-orange-600 text-white text-base font-semibold shadow hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{submitting ? '处理中...' : isInsufficientCredits ? '积分不足' : '确认复用'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ReuseDialog;
