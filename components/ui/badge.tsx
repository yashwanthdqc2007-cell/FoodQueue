import React from "react";
import { clsx } from "clsx";

export type BadgeVariant =
  | "default"
  | "forest"
  | "primary"
  | "mint"
  | "violet"
  | "amber"
  | "red"
  | "muted"
  | "outline"
  | "edible"
  | "reusable"
  | "organic_waste"
  | "unsafe"
  | "verified"
  | "pending";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  icon,
  className,
  ...props
}: BadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const variantClasses: Record<BadgeVariant, string> = {
    default: "bg-brand-surface text-brand-text border border-brand-border",
    forest: "bg-brand-forest text-brand-text border border-brand-forest",
    primary: "bg-brand-primary-light text-brand-primary border border-brand-primary/30",
    mint: "bg-brand-mint-light text-brand-mint border border-brand-mint/40",
    violet: "bg-brand-violet-light text-brand-violet border border-brand-violet/30",
    amber: "bg-brand-amber-light text-brand-amber border border-brand-amber/30",
    red: "bg-brand-red-light text-brand-red border border-brand-red/30",
    muted: "bg-brand-surface text-brand-muted border border-brand-border",
    outline: "bg-transparent text-brand-text border border-brand-border",
    // Domain classifications - Dark First
    edible: "bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 font-semibold",
    reusable: "bg-sky-950/70 text-sky-300 border border-sky-700/50 font-semibold",
    organic_waste: "bg-amber-950/70 text-amber-300 border border-amber-700/50 font-semibold",
    unsafe: "bg-rose-950/70 text-rose-300 border border-rose-700/50 font-semibold",
    verified: "bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 font-semibold",
    pending: "bg-amber-950/70 text-amber-300 border border-amber-700/50 font-semibold",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-full transition-colors select-none",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
