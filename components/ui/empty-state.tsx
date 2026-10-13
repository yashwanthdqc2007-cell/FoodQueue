import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={clsx(
        "rounded-2xl border-2 border-dashed border-brand-border bg-brand-card/80 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-6 shadow-sm",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-brand-primary-light text-brand-primary border border-brand-primary/30 flex items-center justify-center mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-brand-text mb-2">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-brand-muted max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-forest-dark text-xs sm:text-sm font-bold transition shadow-sm"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                <span>{action.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-forest-dark text-xs sm:text-sm font-bold transition shadow-sm"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                <span>{action.label}</span>
              </button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-card text-brand-text text-xs sm:text-sm font-semibold transition"
              >
                <span>{secondaryAction.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-card text-brand-text text-xs sm:text-sm font-semibold transition"
              >
                <span>{secondaryAction.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
