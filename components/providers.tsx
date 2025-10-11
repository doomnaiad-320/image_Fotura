"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { ThemeBackgroundProvider, BackgroundLayer } from "@/components/theme/background-provider";

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000
          }
        }
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeBackgroundProvider>
          <BackgroundLayer />
          {children}
        </ThemeBackgroundProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
