"use client";

import React, { useEffect, useMemo, useRef } from "react";

export interface BasePromptInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  rowsMin?: number; // default 1
  rowsMax?: number; // default 10
  className?: string;
  onHeightChange?: (height: number) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  minHeightPx?: number; // external min height control (e.g., drag to resize)
}

/**
 * BasePromptInput
 * 仅负责提示词输入与自动高度、快捷发送（Shift+Enter）
 * 不包含按钮与高级参数，便于在对话页与弹窗中复用。
 */
export default function BasePromptInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
  autoFocus = false,
  rowsMin = 1,
  rowsMax = 10,
  className = "",
  onHeightChange,
  onPaste,
  minHeightPx
}: BasePromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动高度
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20; // 近似行高
    const minHBase = rowsMin * lineHeight + 16; // padding 近似
    const minH = typeof minHeightPx === 'number' ? Math.max(minHeightPx, minHBase) : minHBase;
    const maxH = rowsMax * lineHeight + 16;
    const next = Math.max(minH, Math.min(el.scrollHeight, maxH));
    el.style.height = `${next}px`;
    onHeightChange?.(next);
    try {
      const evt = new Event("input-area-resized");
      window.dispatchEvent(evt);
    } catch {}
  }, [value, rowsMin, rowsMax, onHeightChange, minHeightPx]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && !disabled) {
        onSubmit(trimmed);
      }
    }
  };

  const baseClass = useMemo(
    () =>
      [
        "w-full resize-none bg-transparent px-3 py-2 text-sm sm:text-base",
        "text-foreground placeholder:text-muted-foreground",
        "focus:outline-none disabled:cursor-not-allowed",
        "overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent",
        className
      ].join(" "),
    [className]
  );

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={onPaste}
      placeholder={placeholder}
      aria-label="输入提示词"
      disabled={disabled}
      rows={rowsMin}
      className={baseClass}
      style={{ minHeight: (minHeightPx ?? 24 * rowsMin), maxHeight: 24 * rowsMax }}
    />
  );
}
