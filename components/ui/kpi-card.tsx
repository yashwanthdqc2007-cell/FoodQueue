import React from "react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "forest" | "mint" | "violet" | "amber" | "muted";
  className?: string;
  badge?: string;
}

export function KpiCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  variant = "primary",
  className,
  badge,
}: KpiCardProps) {
  const iconBgClasses = {
    primary: "bg-brand-primary-light text-brand-primary border-brand-primary/30",
    forest: "bg-brand-forest/30 text-brand-mint border-brand-forest/50",
    mint: "bg-brand-mint-light text-brand-mint border-brand-mint/40",
    violet: "bg-brand-violet-light text-brand-violet border-brand-violet/30",
    amber: "bg-brand-amber-light text-brand-amber border-brand-amber/30",
    muted: "bg-brand-surface text-brand-muted border-brand-border",
  };

  return (
    <div
      className={clsx(
        "glass-card rounded-2xl p-5 border border-brand-border transition-all duration-200 hover:shadow-lg hover:border-brand-primary/40 bg-brand-card relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              {title}
            </span>
            {badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary border border-brand-primary/30 font-medium">
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="text-xs font-semibold text-brand-muted">
                {unit}
              </span>
            )}
          </div>
        </div>

        <div
          className={clsx(
            "p-3 rounded-xl border shrink-0 flex items-center justify-center",
            iconBgClasses[variant]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {subtitle && (
        <div className="mt-3 pt-3 border-t border-brand-border/60 text-xs text-brand-muted flex items-center gap-1.5">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}
