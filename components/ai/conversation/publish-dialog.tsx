'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { ConversationMessage, PublishResponse } from '@/types/conversation';
import { httpFetch } from '@/lib/http';

export interface PublishDialogProps {
  open: boolean;
  message: ConversationMessage | null;
  onClose: () => void;
  onSuccess: (assetId: string) => void;
}

export function PublishDialog({ open, message, onClose, onSuccess }: PublishDialogProps) {
  const [title, setTitle] = useState<string>(() => (message?.content ?? '').slice(0, 40) || 'AI 作品');
  const [tagsText, setTagsText] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [reusePoints, setReusePoints] = useState<number>(50);
  const [submitting, setSubmitting] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);

  React.useEffect(() => {
    if (open && message) {
      setTitle((message.content || '').slice(0, 40) || 'AI 作品');
      setTagsText('');
      setIsPublic(true);
      setReusePoints(50);
      setSubmitting(false);
      setPromptExpanded(false);
    }
  }, [open, message]);

  // 自动上传 blob 到 R2
  const uploadBlobToR2 = async (blobUrl: string): Promise<string> => {
    try {
      // 从 blob URL 获取 Blob
      const response = await fetch(blobUrl);
      const blob = await response.blob();

      // 上传到 R2
      const formData = new FormData();
      formData.append('file', blob, 'image.png');

      const uploadResp = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResp.ok) {
        const error = await uploadResp.json();
        throw new Error(error.error || '上传失败');
      }

      const { url } = await uploadResp.json();
      return url;
    } catch (err: any) {
      console.error('[PublishDialog] upload error', err);
      throw new Error(err?.message || '图片上传失败');
    }
  };

  const handleSubmit = async () => {
    if (!message) return;

    let finalImageUrl = message.imageUrl || '';
    
    try {
      setSubmitting(true);
      
      // 如果是 blob 地址，自动上传到云存储
      if (finalImageUrl.startsWith('blob:')) {
        toast.loading('正在上传图片到云存储...');
        finalImageUrl = await uploadBlobToR2(finalImageUrl);
        toast.dismiss();
        toast.success('图片上传成功');
      }
      
      if (!finalImageUrl || finalImageUrl.startsWith('blob:')) {
        toast.error('图片地址无效');
        return;
      }

      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const fullPrompt = message.editChain?.currentFullPrompt || message.editChain?.fullPrompt || message.content;
      const gen = message.generationParams;

      const payload = {
        title: title.trim() || 'AI 作品',
        messageId: message.id,
        conversationId: message.conversationId,
        imageUrl: finalImageUrl,
        fullPrompt,
        editChain: message.editChain,
        model: gen?.model || 'unknown',
        modelName: gen?.modelName || gen?.model || 'unknown',
        size: gen?.size || '1024x1024',
        mode: gen?.mode || 'txt2img',
        tags,
        isPublic,
        reusePoints
      };

      const resp = await httpFetch<PublishResponse>(
        '/api/assets/publish',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      if (!resp.success || !resp.assetId) {
        throw new Error(resp.error || '发布失败');
      }

      toast.success('发布成功！');
      onSuccess(resp.assetId);
      onClose();
    } catch (err: any) {
      console.error('[PublishDialog] submit error', err);
      toast.error(err?.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-scrim">
      <div
        className="w-full sm:max-w-2xl bg-popover rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold">发布到首页</h3>
          <button
            className="p-3 sm:p-2 rounded-lg hover:bg-accent touch-manipulation"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[70vh] overflow-y-auto">
          {/* 示例图 */}
          {message.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border shadow-sm">
              <img src={message.imageUrl} alt={title} className="w-full max-h-80 object-contain bg-black/5" />
            </div>
          )}

          {/* 模型信息 */}
          <div className="rounded-xl border border-border bg-muted p-3 sm:p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">使用模型：</span>
              <span className="text-foreground font-semibold">{message.generationParams?.modelName || message.generationParams?.model || '未知'}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>尺寸：{message.generationParams?.size || '1024x1024'}</span>
              <span>模式：{message.generationParams?.mode === 'img2img' ? '图生图' : '文生图'}</span>
            </div>
          </div>

          {/* Prompt 折叠区 */}
          <div className="rounded-xl border border-border bg-muted overflow-hidden">
            <button
              onClick={() => setPromptExpanded(!promptExpanded)}
              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span>生成提示词</span>
              </div>
              <svg 
                className={`w-5 h-5 transition-transform ${promptExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {promptExpanded && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
                <div className="text-sm text-foreground bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
                  {message.editChain?.currentFullPrompt || message.editChain?.fullPrompt || message.content || '无提示词'}
                </div>
              </div>
            )}
          </div>

          {/* 标题 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              标题
            </label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="给你的作品取个名字"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              标签（用英文逗号分隔）
            </label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="portrait, cyberpunk, neon"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>

          {/* 复用价格设置 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              复用所需积分
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                max="1000"
                step="10"
                className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="设置为 0 表示免费复用"
                value={reusePoints}
                onChange={(e) => setReusePoints(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">积分</span>
            </div>
            <p className="text-xs text-muted-foreground">
              设置为 0 时，其他用户可免费查看和复用 Prompt；设置积分后，需要支付积分才能复用
            </p>
          </div>

          {/* 是否公开 */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
            <div>
              <p className="text-sm font-medium">公开发布</p>
              <p className="text-xs text-muted-foreground">关闭后仅自己可见（后续实现）</p>
            </div>
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-6 h-6 rounded-lg accent-orange-500"
              />
              <span className="text-sm">{isPublic ? '公开' : '私密'}</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 min-h-[48px] rounded-xl border border-input bg-muted text-foreground text-base font-medium touch-manipulation disabled:opacity-60"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 min-h-[48px] rounded-xl bg-orange-600 text-white text-base font-semibold shadow hover:bg-orange-500 disabled:opacity-60 touch-manipulation flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{submitting ? '发布中...' : '发布'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublishDialog;
