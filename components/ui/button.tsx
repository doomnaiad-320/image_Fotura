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
    "bg-white text-black hover:bg-gray-200 disabled:bg-white/60 disabled:text-black/60",
  secondary:
    "border border-white/20 text-white hover:border-white/40 disabled:border-white/10 disabled:text-white/40",
  ghost: "text-gray-300 hover:text-white disabled:text-gray-600"
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
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          variantClassName[variant],
          sizeClassName[size],
          loading && "pointer-events-none opacity-80",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
