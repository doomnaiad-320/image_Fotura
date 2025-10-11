"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-60",
  secondary:
    "border border-default text-foreground hover:bg-surface-2 disabled:opacity-60",
  ghost: "text-muted-foreground hover:text-foreground disabled:opacity-50"
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
"inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
          variantClassName[variant],
          sizeClassName[size],
          loading && "pointer-events-none opacity-80",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
{loading && (
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[color:rgba(0,0,0,0.2)] border-t-[color:rgba(0,0,0,0.6)] dark:border-[color:rgba(255,255,255,0.3)] dark:border-t-[color:rgba(255,255,255,0.7)]" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
