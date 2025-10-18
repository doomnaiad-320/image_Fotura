import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toaster";

type Props = {
  children: ReactNode;
};

/**
 * Studio V2 独立布局
 * 
 * 不包含顶部导航栏,实现全屏沉浸式对话体验
 * 左侧边栏包含所有导航功能
 */
export default function StudioV2Layout({ children }: Props) {
  return (
    <div className="h-screen overflow-hidden bg-gray-950">
      {children}
      <Toaster />
    </div>
  );
}
