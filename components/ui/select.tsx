"use client";

import React, {
  type SelectHTMLAttributes,
  useId,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { ChevronDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  variant?: "solid" | "ghost";
  onChange?: (e: { target: { value: string } }) => void;
};

export function Select({
  className,
  variant = "solid",
  disabled,
  children,
  name,
  value,
  defaultValue,
  onChange,
  placeholder,
  ...rest
}: Props) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const listboxId = useId();

  const options = useMemo(() => {
    const arr: { value: string; label: React.ReactNode; disabled?: boolean }[] = [];
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      // Support native <option>
      if (typeof child.type === "string" && child.type.toLowerCase() === "option") {
        const v = child.props.value ?? child.props.children ?? "";
        arr.push({ value: String(v), label: child.props.children, disabled: Boolean(child.props.disabled) });
      }
    });
    return arr;
  }, [children]);

  const currentIndex = useMemo(() => {
    const v = value ?? defaultValue ?? "";
    return options.findIndex((o) => String(o.value) === String(v));
  }, [options, value, defaultValue]);

  const currentLabel = useMemo(() => {
    if (currentIndex >= 0) return options[currentIndex]?.label;
    const ph = placeholder ?? (options.length ? (typeof options[0].label === "string" ? options[0].label : "请选择") : "请选择");
    return ph;
  }, [currentIndex, options, placeholder]);

  const emitChange = (v: string) => {
    onChange?.({ target: { value: v } });
  };

  useEffect(() => {
    if (!open) return;
    // position adjustment not needed now; ensure active index is current selection or first enabled
    let idx = currentIndex;
    if (idx < 0) {
      idx = options.findIndex((o) => !o.disabled);
    }
    setActiveIndex(idx);
  }, [open, currentIndex, options]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const moveActive = (delta: number) => {
    if (!options.length) return;
    let i = activeIndex;
    const max = options.length - 1;
    for (let step = 0; step < options.length; step++) {
      i = Math.min(max, Math.max(0, i + delta));
      if (!options[i]?.disabled) break;
      // wrap when reaching edge
      if ((delta > 0 && i === max) || (delta < 0 && i === 0)) {
        i = delta > 0 ? 0 : max;
      }
    }
    setActiveIndex(i);
    const el = document.getElementById(`${listboxId}-opt-${i}`);
    el?.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (activeIndex >= 0) {
        const v = options[activeIndex]?.value;
        if (v != null) emitChange(String(v));
        setOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      moveActive(-1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
  };

  return (
    <div className="relative w-full" {...rest}>
      {/* For forms */}
      {name ? <input type="hidden" name={name} value={String(value ?? options[currentIndex]?.value ?? "")} /> : null}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border px-4 pr-10 py-2 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          variant === "solid" ? "border-input bg-background" : "border-transparent bg-transparent text-muted-foreground",
          className
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
      >
        <span className={cn(!value && "text-muted-foreground")}>{currentLabel}</span>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className={cn(
            "absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-md border border-default bg-popover p-1 shadow-xl focus:outline-none",
            "backdrop-blur supports-[backdrop-filter]:bg-popover/90"
          )}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">暂无选项</div>
          ) : (
            options.map((opt, idx) => {
              const selected = String(opt.value) === String(value ?? defaultValue ?? "");
              const isActive = idx === activeIndex;
              return (
                <div
                  id={`${listboxId}-opt-${idx}`}
                  key={`${String(opt.value)}-${idx}`}
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    opt.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-accent",
                    isActive && !opt.disabled ? "bg-accent" : "",
                  )}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    if (opt.disabled) return;
                    emitChange(String(opt.value));
                    setOpen(false);
                    // return focus to button
                    requestAnimationFrame(() => buttonRef.current?.focus());
                  }}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {selected && <Check className="h-4 w-4 text-foreground" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
