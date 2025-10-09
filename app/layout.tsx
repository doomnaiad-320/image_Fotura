import type { Metadata } from "next";
import "@/styles/globals.css";

import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "AIGC Studio",
  description: "多模型一体化的 AIGC 创作工作室",
  manifest: "/manifest.json",
  applicationName: "AIGC Studio",
  themeColor: "#000000",
  other: {
    "msapplication-navbutton-color": "#000000"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-theme="dark">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
