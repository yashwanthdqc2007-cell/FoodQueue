"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Loader2,
  AlertTriangle,
  UtensilsCrossed,
  Croissant,
  Leaf,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { RescueClock } from "@/components/kitchen/rescue-clock";
import type { RescueClockResult } from "@/lib/rules/rescue-clock";
import { useToast } from "@/components/ui/toast";

export interface OpportunityItem {
  matchId: string;
  surplusId: string;
  matchScore: number;
  status: "recommended" | "accepted" | "rejected" | "expired";
  createdAt: string;
  explainableReasons: string[];
  foodName: string;
  quantity: number;
  unit: string;
  category: string;
  surplusStatus: string;
  preparedAt: string | null;
  reportedAt: string;
  redistributionDeadline: string | null;
  signedImageUrl: string | null;
  notes: string | null;
  kitchen: {
    name: string;
    address: string;
    contactPhone: string | null;
    coordinates?: { latitude: number; longitude: number } | null;
  };
  rescueClock: RescueClockResult;
}

interface OpportunityCardProps {
  opportunity: OpportunityItem;
  onActionComplete?: () => void;
}

export function OpportunityCard({ opportunity, onActionComplete }: OpportunityCardProps) {
  const toast = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(opportunity.status === "accepted");

  const isExpired = opportunity.rescueClock.isExpired || opportunity.surplusStatus === "expired";
  const isAvailable = opportunity.status === "recommended" && !isExpired && opportunity.surplusStatus === "active";

  const categoryBadge = {
    edible_surplus: {
      bg: "bg-emerald-950/70 text-emerald-300 border-emerald-700/50",
      label: "Cooked Meals",
      icon: UtensilsCrossed,
      fallbackGradient: "from-[#122A1D] via-[#163625] to-[#0E1B14]",
    },
    reusable: {
      bg: "bg-amber-950/70 text-amber-300 border-amber-700/50",
      label: "Bakery & Pantry",
      icon: Croissant,
      fallbackGradient: "from-[#2A2012] via-[#332614] to-[#141009]",
    },
    organic: {
      bg: "bg-teal-950/70 text-teal-300 border-teal-700/50",
      label: "Organic Surplus",
      icon: Leaf,
      fallbackGradient: "from-[#0F2624] via-[#143331] to-[#0A1918]",
    },
    unsafe: {
      bg: "bg-rose-950/70 text-rose-300 border-rose-700/50",
      label: "Unsafe / Discard",
      icon: ShieldAlert,
      fallbackGradient: "from-[#2A1212] via-[#331616] to-[#140808]",
    },
    unknown: {
      bg: "bg-brand-surface text-brand-muted border-brand-border",
      label: "Uncategorized",
      icon: HelpCircle,
      fallbackGradient: "from-[#19211D] to-[#121916]",
    },
  }[opportunity.category] || {
    bg: "bg-brand-surface text-brand-muted border-brand-border",
    label: opportunity.category,
    icon: UtensilsCrossed,
    fallbackGradient: "from-[#19211D] to-[#121916]",
  };

  const FallbackIcon = categoryBadge.icon;

  async function handleAccept() {
    setIsAccepting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/matching/${opportunity.matchId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Accepted via Receiver Portal" }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to accept surplus match");
      }

      setIsSuccess(true);
      toast.success(`Accepted ${opportunity.foodName}. Pickup coordination generated.`, "Match Accepted");
      if (onActionComplete) onActionComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error accepting match";
      setActionError(msg);
      toast.error(msg, "Acceptance Failed");
    } finally {
      setIsAccepting(false);
    }
  }

  async function handleReject() {
    if (!confirm("Are you sure you want to decline this surplus recommendation?")) return;

    setIsRejecting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/matching/${opportunity.matchId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to decline surplus match");
      }

      toast.info(`Declined recommendation for ${opportunity.foodName}`, "Match Declined");
      if (onActionComplete) onActionComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error declining match";
      setActionError(msg);
      toast.error(msg, "Action Failed");
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div
      className={`glass-card bg-brand-card border rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-2xl ${
        isSuccess
          ? "border-emerald-600/60 ring-2 ring-emerald-500/20"
          : isExpired
          ? "border-brand-border/40 opacity-50"
          : "border-brand-border hover:border-brand-primary/40"
      }`}
    >
      {/* Top Visual Image / Fallback Art Section */}
      <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-brand-bg-secondary">
        {opportunity.signedImageUrl ? (
          <Image
            src={opportunity.signedImageUrl}
            alt={opportunity.foodName}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${categoryBadge.fallbackGradient} flex flex-col items-center justify-center p-4 text-center relative`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-xs">
              <FallbackIcon className="w-7 h-7 text-brand-mint" />
            </div>
            <span className="text-[11px] font-bold text-brand-text tracking-wide uppercase">
              {categoryBadge.label}
            </span>
            <span className="text-[10px] text-brand-muted mt-0.5">
              Verified Kitchen Batch
            </span>
            <div className="absolute bottom-2 right-2 text-[9px] font-medium text-brand-muted/60 bg-black/40 px-2 py-0.5 rounded-full">
              Category Fallback Artwork
            </div>
          </div>
        )}

        {/* Floating Badges Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border backdrop-blur-md shadow-xs ${categoryBadge.bg}`}>
            {categoryBadge.label}
          </span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* Match Score Chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 backdrop-blur-md text-purple-300 border border-purple-600/50 text-xs font-black shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-violet" />
            <span>Score: {opportunity.matchScore}</span>
          </div>
        </div>

        {/* Quantity Overlay on Image Bottom */}
        <div className="absolute bottom-3 left-3 bg-brand-card/90 backdrop-blur-md border border-brand-border/80 px-3 py-1.5 rounded-xl shadow-md">
          <span className="text-sm font-black text-brand-text">
            {opportunity.quantity}{" "}
            <span className="text-xs font-bold text-brand-primary uppercase">{opportunity.unit}</span>
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Title & Facility */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg sm:text-xl font-black text-brand-text tracking-tight line-clamp-1">
              {opportunity.foodName}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-brand-muted">
            <Building2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="font-semibold text-brand-text truncate">{opportunity.kitchen.name}</span>
          </div>

          <div className="flex items-start gap-1.5 text-xs text-brand-muted pt-0.5">
            <MapPin className="w-3.5 h-3.5 text-brand-muted shrink-0 mt-0.5" />
            <span className="line-clamp-1">{opportunity.kitchen.address}</span>
          </div>
        </div>

        {/* Rescue Clock & Timeline Strip */}
        <div className="p-3.5 rounded-2xl bg-brand-surface border border-brand-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-brand-amber" />
              <span>Rescue Deadline</span>
            </span>
            <span className="text-xs font-bold text-brand-text">
              {opportunity.redistributionDeadline
                ? new Date(opportunity.redistributionDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Open Window"}
            </span>
          </div>

          <RescueClock
            deadlineIso={opportunity.redistributionDeadline}
            initialClock={opportunity.rescueClock}
          />
        </div>

        {/* Match Justifications */}
        {opportunity.explainableReasons && opportunity.explainableReasons.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              Match Determinants
            </span>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.explainableReasons.slice(0, 2).map((reason, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-semibold text-brand-text bg-brand-surface border border-brand-border px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <span className="text-brand-primary font-bold">✓</span>
                  <span>{reason}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error message if action failed */}
        {actionError && (
          <div className="p-2.5 rounded-xl bg-brand-red-light border border-brand-red/30 text-xs text-brand-red flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="pt-2 border-t border-brand-border/60">
          {isAvailable ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isAccepting || isRejecting}
                onClick={handleAccept}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-forest-dark text-xs font-extrabold transition shadow-md disabled:opacity-50"
              >
                {isAccepting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Accept Batch</span>
              </button>

              <button
                type="button"
                disabled={isAccepting || isRejecting}
                onClick={handleReject}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-card text-brand-muted hover:text-brand-text text-xs font-bold transition disabled:opacity-50"
              >
                {isRejecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Decline</span>
              </button>
            </div>
          ) : isSuccess ? (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/50 text-xs text-emerald-300 font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Match accepted! Pickup generated.</span>
            </div>
          ) : isExpired ? (
            <div className="p-3 rounded-xl bg-brand-surface border border-brand-border text-xs text-brand-muted font-bold text-center">
              Rescue window expired
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
