"use client";

import React from "react";

import { Sparkles, Zap, Image as ImageIcon, Box } from "lucide-react";
import { useBgTheme } from "@/components/theme/background-provider";
import { Select, SelectItem } from "@/components/ui/select";

import type { ModelOption } from "../playground";

interface TopBarActionsProps {
  onToggleHistory?: () => void;
}

export function StudioTopBarActions({ onToggleHistory }: TopBarActionsProps) {
  const { resolvedTheme, setTheme } = useBgTheme();
  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <div className="ml-auto flex items-center gap-2 sm:gap-3">


      <span className="hidden h-5 w-px bg-border sm:block" />

      <button
        onClick={toggle}
        className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
        aria-label="切换主题"
        title="切换主题"
        type="button"
      >
        {resolvedTheme === "dark" ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.293 13.293a8 8 0 11-6.586-6.586 6 6 0 106.586 6.586z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4a1 1 0 011 1v1a1 1 0 11-2 0V5a1 1 0 011-1zm0 13a5 5 0 100-10 5 5 0 000 10zm7-6a1 1 0 110-2h1a1 1 0 110 2h-1zM4 12a1 1 0 110-2H3a1 1 0 110 2h1zm11.657 6.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM6.464 6.464A1 1 0 105.05 7.879l.707.707A1 1 0 107.172 7.172l-.707-.707zm9.9-1.414a1 1 0 011.415 1.415l-.707.707a1 1 0 01-1.415-1.415l.707-.707zM7.879 18.95a1 1 0 10-1.415-1.415l-.707.707a1 1 0 101.415 1.415l.707-.707z" />
          </svg>
        )}
      </button>
    </div>
  );
}

interface ConversationHeaderProps {
  models: ModelOption[];
  selectedModel: string | null;
  onModelChange: (modelSlug: string) => void;
  onToggleHistory?: () => void;
}

function getModelIcon(slug: string) {
  if (slug.includes("pro") || slug.includes("ultra")) return <Sparkles className="size-4 text-orange-500" />;
  if (slug.includes("schnell") || slug.includes("turbo") || slug.includes("flash")) return <Zap className="size-4 text-yellow-500" />;
  if (slug.includes("dev")) return <ImageIcon className="size-4 text-blue-500" />;
  return <Box className="size-4 text-muted-foreground" />;
}

function ConversationHeader({
  models,
  selectedModel,
  onModelChange,
  onToggleHistory
}: ConversationHeaderProps) {
  return (
    <div className="flex w-full items-center">
      <div className="flex min-w-0 items-center gap-3">
        <Select
          value={selectedModel || ""}
          onChange={(e) => onModelChange(e.target.value)}
          className="min-w-[200px] w-auto rounded-full bg-background/60 backdrop-blur-md border-border/40 shadow-sm hover:bg-accent/50 transition-colors"
        >
          <SelectItem value="" disabled>
            <span className="text-muted-foreground">请选择模型...</span>
          </SelectItem>
          {models.map((model) => (
            <SelectItem key={model.slug} value={model.slug}>
              <div className="flex items-center gap-2">
                {getModelIcon(model.slug)}
                <span className="font-medium">{model.displayName}</span>
              </div>
            </SelectItem>
          ))}
        </Select>
      </div>

      <StudioTopBarActions onToggleHistory={onToggleHistory} />
    </div>
  );
}

export default ConversationHeader;
