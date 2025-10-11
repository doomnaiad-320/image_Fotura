import type { ReactNode } from "react";

import { MainNavigation } from "@/components/navigation/main-navigation";
import { Toaster } from "@/components/ui/toaster";

type Props = {
  children: ReactNode;
};

export default function WebLayout({ children }: Props) {
  return (
    <div className="min-h-screen">
      <MainNavigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6">{children}</main>
      <Toaster />
    </div>
  );
}
