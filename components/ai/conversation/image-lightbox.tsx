'use client';

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface ImageLightboxProps {
  imageUrl: string;
  alt?: string;
  onClose: () => void;
}

/**
 * 图片预览 Lightbox
 * 
 * 功能：
 * - 全屏展示图片
 * - 点击背景/ESC 键关闭
 * - 平滑进入/退出动画
 * - 移动端友好
 */
export function ImageLightbox({ imageUrl, alt = '生成的图片', onClose }: ImageLightboxProps) {
  // ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';

    // 监听键盘事件
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
        aria-label="关闭"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 图片容器 */}
      <div
        className="relative max-w-7xl max-h-[90vh] w-full mx-4 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={imageUrl}
            alt={alt}
            width={1024}
            height={1024}
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            unoptimized
            priority
          />
        </div>

        {/* 底部工具栏 */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
          <div className="flex items-center justify-between text-white text-sm">
            <span className="opacity-75">{alt}</span>

            <div className="flex gap-2">
              {/* 下载按钮 */}
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = imageUrl;
                  link.download = `aigc-${Date.now()}.png`;
                  link.click();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>下载</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 提示文本 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        点击背景或按 ESC 关闭
      </div>
    </div>,
    document.body
  ) : null;
}

export default ImageLightbox;
