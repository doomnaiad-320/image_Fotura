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
    <html lang="zh-CN" suppressHydrationWarning data-theme="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('ui:bg-theme');
                  var theme;
                  if (saved === 'auto') {
                    var h = new Date().getHours();
                    theme = (h >= 7 && h < 19) ? 'light' : 'dark';
                  } else if (saved === 'light' || saved === 'dark') {
                    theme = saved;
                  } else {
                    theme = 'dark';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
