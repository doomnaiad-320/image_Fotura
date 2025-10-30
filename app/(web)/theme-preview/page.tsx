"use client";

import { useState } from "react";
import styles from "./theme.module.css";

export default function ThemePreviewPage() {
  const [dark, setDark] = useState(false);
  const items = [
    { key: "dashboard", label: "Dashboard" },
    { key: "explore", label: "Explore" },
    { key: "favorites", label: "Favorites" },
    { key: "settings", label: "Settings" }
  ];

  const activeKey = "dashboard";

  return (
    <div className={`${styles.theme} ${dark ? styles.dark : ""} min-h-[80vh] rounded-[var(--radius)] border border-[hsl(var(--border))] overflow-hidden`}>      
      <div className="grid grid-cols-[16rem_1fr]">
        {/* Sidebar */}
        <aside className="bg-surface text-foreground border-r border-default flex flex-col">
          <div className="p-4">
            <div className="text-sm uppercase tracking-wide text-muted-foreground">Preview</div>
            <div className="mt-1 font-semibold">Shadcn Theme Sidebar</div>
          </div>
          <nav className="px-2">
            {items.map((it) => {
              const active = it.key === activeKey;
              return (
                <button
                  key={it.key}
                  className={`w-full text-left px-3 py-2 mb-1 rounded-[var(--radius)] transition-colors 
                    ${active ?
                      "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" :
                      "text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"}
                  `}
                >
                  {it.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto p-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
              Dark mode
            </label>
          </div>
        </aside>

        {/* Main content */}
        <main className="bg-app text-foreground">
          <div className="p-6 md:p-8 space-y-6">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">Theme Preview</h1>
                <p className="text-sm text-muted-foreground">Shadcn-like tokens mapped to current project variables.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border border-[hsl(var(--border))]">Primary</button>
                <button className="px-3 py-1.5 rounded-[var(--radius)] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] border border-[hsl(var(--border))]">Secondary</button>
                <button className="px-3 py-1.5 rounded-[var(--radius)] bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] border border-[hsl(var(--border))]">Danger</button>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <div className="text-sm text-muted-foreground">Card</div>
                <div className="mt-2">Foreground sample</div>
              </div>
              <div className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4">
                <div className="text-sm text-muted-foreground">Muted</div>
                <div className="mt-2">Muted surface sample</div>
              </div>
              <div className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-surface p-4">
                <div className="text-sm text-muted-foreground">Surface</div>
                <div className="mt-2">Uses project surface token</div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="inline-block h-6 w-6 rounded-full bg-[hsl(var(--primary))]" />
                <span className="inline-block h-6 w-6 rounded-full bg-[hsl(var(--secondary))]" />
                <span className="inline-block h-6 w-6 rounded-full bg-[hsl(var(--accent))]" />
                <span className="inline-block h-6 w-6 rounded-full bg-[hsl(var(--muted))]" />
                <span className="inline-block h-6 w-6 rounded-full bg-[hsl(var(--border))]" />
              </div>
              <div className="text-xs text-muted-foreground">Palette swatches</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
