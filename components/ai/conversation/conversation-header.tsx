"use client";

import React from "react";

import { Sparkles, Zap, Image as ImageIcon, Box, History } from "lucide-react";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { Select, SelectItem } from "@/components/ui/select";

import type { ModelOption } from "../playground";

interface TopBarActionsProps {
  onToggleHistory?: () => void;
}

export function StudioTopBarActions({ onToggleHistory }: TopBarActionsProps) {
  return (
    <div className="ml-auto flex items-center gap-2 sm:gap-3">
      {onToggleHistory && (
        <>
          <button
            type="button"
            onClick={onToggleHistory}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted"
            title="查看历史记录"
            aria-label="查看历史记录"
          >
            <History className="size-4" />
          </button>
          <span className="hidden h-5 w-px bg-border sm:block" />
        </>
      )}
      <ThemeToggle size="sm" />
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
