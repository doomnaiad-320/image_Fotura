import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-gray-400",
        className
      )}
    >
      {children}
    </span>
  );
}
