"use client";

import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Check,
} from "lucide-react";
import type { DemandPredictionResult } from "@/lib/prediction/baseline";
import { Badge } from "@/components/ui/badge";

interface PredictionCardProps {
  prediction: DemandPredictionResult | null;
  unit: string;
  onApplyRecommended?: (quantity: number, consumers: number) => void;
  isLoading?: boolean;
}

export function PredictionCard({ prediction, unit, onApplyRecommended, isLoading }: PredictionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-6 shadow-xs animate-pulse text-brand-text">
        <div className="h-5 bg-brand-surface rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-16 bg-brand-surface rounded-2xl"></div>
          <div className="h-16 bg-brand-surface rounded-2xl"></div>
          <div className="h-16 bg-brand-surface rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-brand-surface/80 border border-dashed border-brand-border rounded-3xl p-6 text-center text-brand-text">
        <Sparkles className="w-8 h-8 text-brand-primary mx-auto mb-2 opacity-80" />
        <h4 className="text-xs font-bold text-brand-text">Demand Forecasting Engine Ready</h4>
        <p className="text-[11px] text-brand-muted mt-1 max-w-sm mx-auto">
          Select a date and meal shift to generate transparent historical baseline forecasts.
        </p>
      </div>
    );
  }

  const tierStyles = {
    HIGH: {
      variant: "primary" as const,
      icon: ShieldCheck,
      label: "High Confidence",
      description: "Based on extensive 28-day historical samples.",
    },
    MEDIUM: {
      variant: "amber" as const,
      icon: Info,
      label: "Medium Confidence",
      description: "Limited recent samples available; dynamic weights applied.",
    },
    LOW: {
      variant: "red" as const,
      icon: AlertTriangle,
      label: "Low Confidence",
      description: "Sparse history; recommend manual review.",
    },
    COLD_START: {
      variant: "violet" as const,
      icon: HelpCircle,
      label: "Cold Start Baseline",
      description: "No past consumption data found; using standard defaults.",
    },
  };

  const currentTier = tierStyles[prediction.confidenceTier] || tierStyles.COLD_START;
  const TierIcon = currentTier.icon;

  return (
    <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-5 sm:p-6 shadow-md space-y-4 text-brand-text">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-primary-light text-brand-primary border border-brand-primary/30">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-brand-text">Baseline Demand Prediction</h3>
            <span className="text-[10px] text-brand-muted font-mono">Algorithm: {prediction.modelVersion} (Deterministic)</span>
          </div>
        </div>

        <Badge variant={currentTier.variant} size="md" icon={<TierIcon className="w-3.5 h-3.5" />}>
          <span>{currentTier.label} ({Math.round(prediction.confidence * 100)}%)</span>
        </Badge>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Predicted Headcount */}
        <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border">
          <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Predicted Consumers</div>
          <div className="text-2xl font-black text-brand-text mt-1">
            {prediction.predictedConsumers} <span className="text-xs font-semibold text-brand-muted">people</span>
          </div>
          <div className="text-[10px] text-brand-muted mt-0.5">Historical weighted demand</div>
        </div>

        {/* Recommended Prep */}
        <div className="p-4 rounded-2xl bg-brand-primary-light border border-brand-primary/30">
          <div className="text-[11px] font-bold text-brand-primary flex items-center justify-between uppercase tracking-wider">
            <span>Recommended Prep</span>
            <span className="text-[10px] bg-brand-primary text-brand-forest-dark px-2 py-0.5 rounded-full font-black">+3% Buffer</span>
          </div>
          <div className="text-2xl font-black text-brand-text mt-1">
            {prediction.recommendedQuantity} <span className="text-xs font-bold text-brand-primary uppercase">{unit}</span>
          </div>
          <div className="text-[10px] text-brand-primary mt-0.5 font-medium">Optimal cooking batch target</div>
        </div>

        {/* Modeled Buffer Surplus */}
        <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border">
          <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Modeled Safety Buffer</div>
          <div className="text-2xl font-black text-brand-text mt-1">
            {prediction.predictedSurplus} <span className="text-xs font-semibold text-brand-muted uppercase">{unit}</span>
          </div>
          <div className="text-[10px] text-brand-muted mt-0.5">Preparation margin (not waste)</div>
        </div>
      </div>

      {/* Quick Apply Action */}
      {onApplyRecommended && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => onApplyRecommended(prediction.recommendedQuantity, prediction.predictedConsumers)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-forest-dark text-xs font-black transition shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Recommendation ({prediction.recommendedQuantity} {unit})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-text font-bold transition"
          >
            <span>{isExpanded ? "Hide Formula" : "Explain Calculation"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Transparent Calculation Breakdown */}
      {isExpanded && (
        <div className="mt-3 pt-3.5 border-t border-brand-border/60 bg-brand-surface rounded-2xl p-4 space-y-3 text-xs text-brand-text">
          <div className="font-bold text-brand-text flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-brand-primary" />
            <span>Deterministic Forecast Breakdown (50% / 30% / 20% Baseline Rule)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div className="bg-brand-card p-3 rounded-xl border border-brand-border">
              <div className="font-bold text-brand-muted">1. Same-Weekday Avg (50%)</div>
              <div className="text-sm font-extrabold text-brand-text mt-1">
                {prediction.breakdown.weekdayAverage !== null ? `${prediction.breakdown.weekdayAverage} consumers` : "No samples"}
              </div>
              <div className="text-[10px] text-brand-muted mt-0.5">({prediction.breakdown.weekdaySampleCount} samples in window)</div>
            </div>

            <div className="bg-brand-card p-3 rounded-xl border border-brand-border">
              <div className="font-bold text-brand-muted">2. Recent 7-Day Avg (30%)</div>
              <div className="text-sm font-extrabold text-brand-text mt-1">
                {prediction.breakdown.sevenDayAverage !== null ? `${prediction.breakdown.sevenDayAverage} consumers` : "No samples"}
              </div>
              <div className="text-[10px] text-brand-muted mt-0.5">({prediction.breakdown.sevenDaySampleCount} samples in window)</div>
            </div>

            <div className="bg-brand-card p-3 rounded-xl border border-brand-border">
              <div className="font-bold text-brand-muted">3. 28-Day Shift Avg (20%)</div>
              <div className="text-sm font-extrabold text-brand-text mt-1">
                {prediction.breakdown.periodAverage !== null ? `${prediction.breakdown.periodAverage} consumers` : "No samples"}
              </div>
              <div className="text-[10px] text-brand-muted mt-0.5">({prediction.breakdown.periodSampleCount} total shift meals)</div>
            </div>
          </div>

          <div className="bg-brand-card p-3 rounded-xl border border-brand-border text-[11px] space-y-1.5 font-medium">
            <div>
              <span className="text-brand-muted font-bold">Portion Ratio:</span>{" "}
              <strong>{prediction.portionRatio} {unit}/consumer</strong>{" "}
              <span className="text-brand-muted">(historical arithmetic mean)</span>
            </div>
            <div>
              <span className="text-brand-muted font-bold">Preparation Target:</span>{" "}
              <code className="bg-brand-surface px-1.5 py-0.5 rounded text-brand-primary font-mono">{prediction.predictedConsumers} consumers × {prediction.portionRatio} × 1.03 buffer = {prediction.recommendedQuantity} {unit}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
