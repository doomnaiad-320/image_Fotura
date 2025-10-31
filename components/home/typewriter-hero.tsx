"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

const phrases = [
  "AI 驱动的创意未来",
  "多模态内容创作平台",
  "释放无限创意可能",
  "智能生成·精准高效"
];

export function TypewriterHero() {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = phrases[currentPhrase];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // 打字中
          if (displayText.length < currentText.length) {
            setDisplayText(currentText.slice(0, displayText.length + 1));
          } else {
            // 完成打字，等待后开始删除
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          // 删除中
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1));
          } else {
            // 完成删除，切换到下一句
            setIsDeleting(false);
            setCurrentPhrase((prev) => (prev + 1) % phrases.length);
          }
        }
      },
      isDeleting ? 50 : 100
    );

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhrase]);

  return (
    <section className="relative">
      {/* 背景渐变效果 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl dark:bg-white/[0.02]" />
        <div className="absolute right-1/4 top-20 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-3xl dark:bg-white/[0.02]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-20 md:py-32 lg:py-40">
        <div className="space-y-8 text-center">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-purple-500 blur-xl opacity-40 dark:from-[#5daa9f]/20 dark:to-[#5daa9f]/20 dark:opacity-15" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl dark:bg-[#5daa9f]">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          {/* 主标题 */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="text-[#3a3a3a] dark:text-[#d5d5d5]">
              AIGC Studio
            </span>
          </h1>

          {/* 打字机副标题 */}
          <div className="flex min-h-[3rem] items-center justify-center md:min-h-[4rem]">
            <p className="text-xl font-medium text-[#808080] sm:text-2xl md:text-3xl lg:text-4xl dark:text-[#a8a8a8]">
              {displayText}
              <span className="inline-block w-[3px] animate-pulse bg-[#5daa9f] ml-1 h-6 md:h-8 lg:h-10 align-middle" />
            </p>
          </div>

          {/* 描述文本 */}
          <p className="mx-auto max-w-2xl text-sm text-[#8a8a8a] sm:text-base md:text-lg dark:text-[#a8a8a8]">
            汇聚顶尖 AI 模型，提供文本生成、图像创作、多模态编辑能力。
            <br className="hidden sm:block" />
            探索社区灵感，开启你的 AIGC 创作之旅。
          </p>

          {/* CTA 按钮组 */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 pt-4">
            <Link
              href="/studio"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#c17c68] px-8 py-3 text-base font-semibold text-white shadow-none transition-all hover:bg-[#c17c68]/90 sm:px-10 sm:py-4 sm:text-lg dark:bg-[#d4856f] dark:hover:bg-[#d4856f]/90"
            >
              <span className="relative z-10">开始创作</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="#explore"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#d5d5d5] bg-white px-8 py-3 text-base font-semibold text-[#4a4a4a] transition-all hover:border-[#c5c5c5] hover:bg-gray-50 sm:px-10 sm:py-4 sm:text-lg dark:border-[#5a5a5a] dark:bg-[#5a5a5a]/30 dark:text-[#b0b0b0] dark:hover:border-[#6a6a6a] dark:hover:bg-[#5a5a5a]/50"
            >
              浏览灵感
            </Link>
          </div>

          {/* 特性标签 */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-8 text-xs sm:text-sm">
            {["多模型支持", "实时生成", "社区共享", "Credits 计费"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#e0e0e0] bg-[#f5f5f5]/80 px-4 py-1.5 text-[#808080] backdrop-blur dark:border-[#5a5a5a] dark:bg-[#4a4a4a]/30 dark:text-[#a8a8a8]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 底部渐变分隔 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
}
