"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, Utensils, Eye, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { RescueClock } from "./rescue-clock";
import type { RescueClockResult } from "@/lib/rules/rescue-clock";
import type { RecoveryDecision } from "@/lib/rules/recovery-engine";

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

  const categoryColor = {
    edible_surplus: "bg-emerald-100 text-emerald-800 border-emerald-200",
    reusable: "bg-blue-100 text-blue-800 border-blue-200",
    organic: "bg-amber-100 text-amber-800 border-amber-200",
    unsafe: "bg-rose-100 text-rose-800 border-rose-200",
    unknown: "bg-slate-100 text-slate-700 border-slate-200",
  }[item.category] || "bg-slate-100 text-slate-700 border-slate-200";

  const decisionColor = {
    REDISTRIBUTE: "bg-emerald-600 text-white",
    RECOVERY: "bg-amber-600 text-white",
    DISPOSE: "bg-rose-600 text-white",
  }[item.recoveryDecision?.path || "REDISTRIBUTE"] || "bg-slate-600 text-white";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between">
      {/* Card Header & Image Area */}
      <div>
        <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-slate-100">
          {item.signedImageUrl ? (
            <Image
              src={item.signedImageUrl}
              alt={item.foodName}
              fill
              className="object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
              <Utensils className="w-8 h-8 opacity-40" />
              <span className="text-[11px] font-medium">No photo uploaded</span>
            </div>
          )}

          {/* Floating Status / Decision Badge */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {item.recoveryDecision && (
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-xs tracking-wider ${decisionColor}`}
              >
                {item.recoveryDecision.path}
              </span>
            )}
          </div>

          <div className="absolute bottom-2.5 left-2.5">
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shadow-xs ${categoryColor}`}
            >
              {item.category.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-1">
                {item.foodName}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {item.sourceMeal?.mealName ? `From: ${item.sourceMeal.mealName}` : "Direct surplus logging"}
              </span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-sm font-black text-slate-900">
                {item.quantity} <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
              </span>
            </div>
          </div>

          {/* Rescue Clock */}
          <RescueClock
            deadlineIso={item.redistributionDeadline}
            initialClock={item.rescueClock}
          />

          {/* AI Assessment Bar */}
          <div className="rounded-xl p-2.5 bg-slate-50 border border-slate-200/70 text-xs">
            {hasAiScan ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI: {Math.round((item.aiConfidence || 0) * 100)}% Confidence</span>
                </div>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Advisory only</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px]">Visual inspection pending</span>
                <button
                  type="button"
                  onClick={() => onOpenAiScan(item)}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-800 inline-flex items-center gap-1"
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
      <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-slate-100 mt-2">
        <button
          type="button"
          onClick={() => onOpenAiScan(item)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 text-purple-700 bg-purple-50/50 hover:bg-purple-100 text-xs font-semibold transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{hasAiScan ? "Re-Analyze" : "Analyze Food"}</span>
        </button>

        <Link
          href={`/kitchen/surplus/${item.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
