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
  const isBlob = useMemo(() => (message?.imageUrl ?? '').startsWith('blob:'), [message?.imageUrl]);

  const [title, setTitle] = useState<string>(() => (message?.content ?? '').slice(0, 40) || 'AI 作品');
  const [imageUrl, setImageUrl] = useState<string>(() => message?.imageUrl ?? '');
  const [tagsText, setTagsText] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (open && message) {
      setTitle((message.content || '').slice(0, 40) || 'AI 作品');
      setImageUrl(message.imageUrl || '');
      setTagsText('');
      setIsPublic(true);
      setSubmitting(false);
      setUploading(false);
    }
  }, [open, message]);

  const effectiveImageUrl = imageUrl.trim();

  // 上传 blob 到 R2
  const handleUploadBlob = async () => {
    if (!message?.imageUrl || !message.imageUrl.startsWith('blob:')) {
      toast.error('当前不是 blob:// 地址');
      return;
    }

    try {
      setUploading(true);

      // 从 blob URL 获取 Blob
      const response = await fetch(message.imageUrl);
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
      setImageUrl(url);
      toast.success('上传成功！');
    } catch (err: any) {
      console.error('[PublishDialog] upload error', err);
      toast.error(err?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!message) return;

    if (!effectiveImageUrl) {
      toast.error('请填写图片地址');
      return;
    }
    
    // 如果是 blob 地址，自动上传到云存储
    if (effectiveImageUrl.startsWith('blob:')) {
      toast.loading('正在上传图片到云存储...');
      try {
        await handleUploadBlob();
        // 上传成功后会自动更新 imageUrl，等待状态更新
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err: any) {
        toast.error(err?.message || '上传失败，请重试');
        return;
      }
    }
    
    // 再次检查 imageUrl 是否有效
    const finalImageUrl = imageUrl.trim();
    if (!finalImageUrl || finalImageUrl.startsWith('blob:')) {
      toast.error('图片上传未完成，请重试');
      return;
    }

    try {
      setSubmitting(true);
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
        isPublic
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
        className="w-full sm:max-w-2xl bg-surface rounded-t-2xl sm:rounded-2xl border border-default shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-default">
          <h3 className="text-base sm:text-lg font-semibold">发布到首页</h3>
          <button
            className="p-3 sm:p-2 rounded-lg hover:bg-surface-2 touch-manipulation"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* 预览 */}
          {message.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-default">
              <img src={message.imageUrl} alt={title} className="w-full max-h-80 object-contain bg-black/5" />
            </div>
          )}

          {/* 提示：blob URL 不可发布 */}
          {isBlob && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 sm:p-4 space-y-3">
              <div className="text-orange-600 text-sm">
                当前图片地址为本地 blob://，需要上传到云存储后才能发布。
              </div>
              <button
                onClick={handleUploadBlob}
                disabled={uploading}
                className="w-full min-h-[44px] rounded-lg bg-orange-600 text-white text-sm font-medium shadow hover:bg-orange-500 disabled:opacity-60 touch-manipulation flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>上传中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>一键上传到云存储</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 图片地址 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">图片地址（URL）</label>
            <input
              type="url"
              inputMode="url"
              className="w-full rounded-xl border border-default bg-surface-2 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="https://example.com/your-image.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {/* 标题 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">标题</label>
            <input
              className="w-full rounded-xl border border-default bg-surface-2 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="给你的作品取个名字"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">标签（用英文逗号分隔）</label>
            <input
              className="w-full rounded-xl border border-default bg-surface-2 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="portrait, cyberpunk, neon"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>

          {/* 是否公开 */}
          <div className="flex items-center justify-between rounded-xl border border-default bg-surface-2 px-4 py-3">
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
        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-default">
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-default bg-surface-2 text-foreground text-base font-medium touch-manipulation"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="flex-1 min-h-[48px] rounded-xl bg-orange-600 text-white text-base font-semibold shadow hover:bg-orange-500 disabled:opacity-60 touch-manipulation"
          >
            {submitting ? '发布中...' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublishDialog;
