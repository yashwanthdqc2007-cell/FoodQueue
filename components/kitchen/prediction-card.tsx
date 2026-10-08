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
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center">
        <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-xs font-semibold text-slate-700">Demand Forecasting Engine Ready</h4>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
          Select a date and meal shift to generate transparent historical baseline forecasts.
        </p>
      </div>
    );
  }

  const tierStyles = {
    HIGH: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: ShieldCheck,
      label: "High Confidence (90%+)",
      description: "Based on extensive 28-day historical samples.",
    },
    MEDIUM: {
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Info,
      label: "Medium Confidence",
      description: "Limited recent samples available; dynamic weights applied.",
    },
    LOW: {
      bg: "bg-orange-50 text-orange-700 border-orange-200",
      icon: AlertTriangle,
      label: "Low Confidence",
      description: "Sparse history; recommend manual review.",
    },
    COLD_START: {
      bg: "bg-purple-50 text-purple-700 border-purple-200",
      icon: HelpCircle,
      label: "Cold Start / Manual Baseline",
      description: "No past consumption data found; using manual or standard defaults.",
    },
  };

  const currentTier = tierStyles[prediction.confidenceTier] || tierStyles.COLD_START;
  const TierIcon = currentTier.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Baseline Demand Prediction</h3>
            <span className="text-[10px] text-slate-400 font-mono">Model: {prediction.modelVersion}</span>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentTier.bg}`}>
          <TierIcon className="w-3.5 h-3.5" />
          <span>{currentTier.label}</span>
          <span className="text-[11px] opacity-75">({Math.round(prediction.confidence * 100)}%)</span>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Predicted Headcount */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-medium text-slate-500">Predicted Consumers</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {prediction.predictedConsumers} <span className="text-xs font-normal text-slate-500">people</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Historical weighted demand</div>
        </div>

        {/* Recommended Prep */}
        <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
          <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
            <span>Recommended Prep</span>
            <span className="text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded font-semibold text-emerald-700">+3% Buffer</span>
          </div>
          <div className="text-xl font-bold text-emerald-900 mt-1">
            {prediction.recommendedQuantity} <span className="text-xs font-normal text-emerald-700">{unit}</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Optimal cooking target</div>
        </div>

        {/* Modeled Buffer Surplus */}
        <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200">
          <div className="text-[11px] font-medium text-blue-800">Modeled Prep Buffer</div>
          <div className="text-xl font-bold text-blue-900 mt-1">
            {prediction.predictedSurplus} <span className="text-xs font-normal text-blue-700">{unit}</span>
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">Safety buffer (not actual waste)</div>
        </div>
      </div>

      {/* Quick Apply Action */}
      {onApplyRecommended && (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => onApplyRecommended(prediction.recommendedQuantity, prediction.predictedConsumers)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Recommendation ({prediction.recommendedQuantity} {unit})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            <span>{isExpanded ? "Hide Calculation" : "Explain Calculation"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Transparent Calculation Breakdown */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/60 rounded-lg p-3 space-y-3 text-xs text-slate-700">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Deterministic Forecast Breakdown (50% / 30% / 20% Rule)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-white p-2.5 rounded border border-slate-200">
              <div className="font-medium text-slate-500">1. Same-Weekday Avg (50%)</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {prediction.breakdown.weekdayAverage !== null ? `${prediction.breakdown.weekdayAverage} consumers` : "No samples"}
              </div>
              <div className="text-[10px] text-slate-400">({prediction.breakdown.weekdaySampleCount} samples in window)</div>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200">
              <div className="font-medium text-slate-500">2. Recent 7-Day Avg (30%)</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {prediction.breakdown.sevenDayAverage !== null ? `${prediction.breakdown.sevenDayAverage} consumers` : "No samples"}
              </div>
              <div className="text-[10px] text-slate-400">({prediction.breakdown.sevenDaySampleCount} samples in window)</div>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200">
              <div className="font-medium text-slate-500">3. 28-Day Period Avg (20%)</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {prediction.breakdown.periodAverage !== null ? `${prediction.breakdown.periodAverage} consumers` : "No samples"}
              </div>
              <div className="text-[10px] text-slate-400">({prediction.breakdown.periodSampleCount} total shift meals)</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-slate-200 text-[11px] space-y-1">
            <div>
              <span className="font-medium text-slate-600">Portion Ratio:</span>{" "}
              <strong>{prediction.portionRatio} {unit}/consumer</strong>{" "}
              <span className="text-slate-400">(historical arithmetic mean)</span>
            </div>
            <div>
              <span className="font-medium text-slate-600">Preparation Formula:</span>{" "}
              <code>{prediction.predictedConsumers} consumers × {prediction.portionRatio} × 1.03 = {prediction.recommendedQuantity} {unit}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
