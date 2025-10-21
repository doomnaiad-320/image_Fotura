import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toaster";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-app">
      {children}
      <Toaster />
    </div>
  );
}
