"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, UtensilsCrossed, ArrowRight, ShieldCheck, Clock, CheckCircle2, Croissant, Leaf, ShieldAlert } from "lucide-react";
import { RescueClock } from "./rescue-clock";
import type { RescueClockResult } from "@/lib/rules/rescue-clock";
import type { RecoveryDecision } from "@/lib/rules/recovery-engine";
import { Badge } from "@/components/ui/badge";

export interface SurplusCardItem {
  id: string;
  foodName: string;
  quantity: number;
  unit: string;
  status: string;
  category: string;
  aiConfidence?: number | null;
  imagePath?: string | null;
  signedImageUrl?: string | null;
  preparedAt?: string | null;
  reportedAt?: string | null;
  redistributionDeadline?: string | null;
  notes?: string | null;
  sourceMeal?: {
    id: string;
    mealName: string;
    mealPeriod: string;
  } | null;
  rescueClock?: RescueClockResult;
  recoveryDecision?: RecoveryDecision;
}

interface SurplusCardProps {
  item: SurplusCardItem;
  onOpenAiScan: (item: SurplusCardItem) => void;
}

export function SurplusCard({ item, onOpenAiScan }: SurplusCardProps) {
  const hasAiScan = item.aiConfidence !== null && item.aiConfidence !== undefined && item.aiConfidence > 0;

  const categoryBadgeVariant: Record<string, any> = {
    edible_surplus: "edible",
    reusable: "reusable",
    organic: "organic_waste",
    unsafe: "unsafe",
    unknown: "default",
  };

  const decisionColor = {
    REDISTRIBUTE: "bg-brand-primary text-brand-forest-dark",
    RECOVERY: "bg-brand-amber text-brand-forest-dark",
    DISPOSE: "bg-brand-red text-white",
  }[item.recoveryDecision?.path || "REDISTRIBUTE"] || "bg-brand-forest text-brand-mint";

  const categoryArtwork = {
    edible_surplus: {
      gradient: "from-[#122A1D] via-[#163625] to-[#0E1B14]",
      icon: UtensilsCrossed,
      label: "Cooked Meal",
    },
    reusable: {
      gradient: "from-[#2A2012] via-[#332614] to-[#141009]",
      icon: Croissant,
      label: "Bakery / Pantry",
    },
    organic: {
      gradient: "from-[#0F2624] via-[#143331] to-[#0A1918]",
      icon: Leaf,
      label: "Organic Surplus",
    },
    unsafe: {
      gradient: "from-[#2A1212] via-[#331616] to-[#140808]",
      icon: ShieldAlert,
      label: "Unsafe Batch",
    },
    unknown: {
      gradient: "from-[#19211D] to-[#121916]",
      icon: UtensilsCrossed,
      label: "Unclassified Batch",
    },
  }[item.category] || {
    gradient: "from-[#19211D] to-[#121916]",
    icon: UtensilsCrossed,
    label: item.category,
  };

  const CategoryIcon = categoryArtwork.icon;

  return (
    <div className="glass-card bg-brand-card rounded-3xl border border-brand-border shadow-md hover:border-brand-primary/40 transition-all overflow-hidden flex flex-col justify-between text-brand-text">
      {/* Card Header & Image Area */}
      <div>
        <div className="relative aspect-video bg-brand-bg-secondary overflow-hidden border-b border-brand-border">
          {item.signedImageUrl ? (
            <Image
              src={item.signedImageUrl}
              alt={item.foodName}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${categoryArtwork.gradient} flex flex-col items-center justify-center p-4 text-center relative`}>
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-1.5 shadow-xs">
                <CategoryIcon className="w-6 h-6 text-brand-mint" />
              </div>
              <span className="text-[11px] font-bold text-brand-text tracking-wide uppercase">
                {categoryArtwork.label}
              </span>
              <div className="absolute bottom-2 right-2 text-[9px] font-medium text-brand-muted/70 bg-black/40 px-2 py-0.5 rounded-full">
                No photo uploaded &bull; Category fallback
              </div>
            </div>
          )}

          {/* Floating Status / Decision Badge */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {item.recoveryDecision && (
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md tracking-wider ${decisionColor}`}
              >
                {item.recoveryDecision.path}
              </span>
            )}
          </div>

          <div className="absolute bottom-2.5 left-2.5">
            <Badge variant={categoryBadgeVariant[item.category] || "default"} size="sm">
              {item.category.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-brand-text leading-tight line-clamp-1">
                {item.foodName}
              </h3>
              <span className="text-xs text-brand-muted font-medium">
                {item.sourceMeal?.mealName ? `From: ${item.sourceMeal.mealName}` : "Direct surplus declaration"}
              </span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-base font-black text-brand-text">
                {item.quantity} <span className="text-xs font-bold text-brand-primary uppercase">{item.unit}</span>
              </span>
            </div>
          </div>

          {/* Rescue Clock */}
          <RescueClock
            deadlineIso={item.redistributionDeadline}
            initialClock={item.rescueClock}
          />

          {/* AI Assessment Bar */}
          <div className="rounded-xl p-3 bg-brand-surface border border-brand-border text-xs">
            {hasAiScan ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-brand-violet font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-brand-violet" />
                  <span>AI: {Math.round((item.aiConfidence || 0) * 100)}% Confidence</span>
                </div>
                <span className="text-[10px] text-brand-muted flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-brand-primary" />
                  <span>Advisory screening only</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[11px] font-medium">AI safety scan available</span>
                <button
                  type="button"
                  onClick={() => onOpenAiScan(item)}
                  className="text-[11px] font-bold text-brand-violet hover:underline inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Scan Now</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="p-4 sm:p-5 pt-0 flex items-center justify-between gap-2 border-t border-brand-border/60 mt-2">
        <button
          type="button"
          onClick={() => onOpenAiScan(item)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-violet/30 text-brand-violet bg-brand-violet-light/60 hover:bg-brand-violet-light text-xs font-bold transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{hasAiScan ? "Re-Analyze" : "Analyze Food"}</span>
        </button>

        <Link
          href={`/kitchen/surplus/${item.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline transition"
        >
          <span>View Details &amp; Matches</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
