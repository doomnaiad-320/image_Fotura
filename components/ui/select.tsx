"use client";

import { type SelectHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: "solid" | "ghost";
};

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className, variant = "solid", ...props }, ref) => {
    return (
      <select
        ref={ref}
className={cn(
          "w-full appearance-none rounded-full border px-4 py-2 text-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-foreground)]",
          variant === "solid"
            ? "border-default bg-[var(--color-surface)]"
            : "border-transparent bg-transparent text-muted-foreground",
          className
        )}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";
