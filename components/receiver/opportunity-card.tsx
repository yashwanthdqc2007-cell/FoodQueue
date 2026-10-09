"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building2,
  Phone,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { RescueClock } from "@/components/kitchen/rescue-clock";
import type { RescueClockResult } from "@/lib/rules/rescue-clock";

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
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(opportunity.status === "accepted");

  const isExpired = opportunity.rescueClock.isExpired || opportunity.surplusStatus === "expired";
  const isAvailable = opportunity.status === "recommended" && !isExpired && opportunity.surplusStatus === "active";

  const categoryColor = {
    edible_surplus: "bg-emerald-100 text-emerald-800 border-emerald-200",
    reusable: "bg-blue-100 text-blue-800 border-blue-200",
    organic: "bg-amber-100 text-amber-800 border-amber-200",
    unsafe: "bg-rose-100 text-rose-800 border-rose-200",
    unknown: "bg-slate-100 text-slate-700 border-slate-200",
  }[opportunity.category] || "bg-slate-100 text-slate-700 border-slate-200";

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
      if (onActionComplete) onActionComplete();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error accepting match");
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

      if (onActionComplete) onActionComplete();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error declining match");
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div
      className={`bg-white border rounded-2xl shadow-xs overflow-hidden transition hover:shadow-md ${
        isSuccess
          ? "border-emerald-300 ring-1 ring-emerald-400/20"
          : isExpired
          ? "border-slate-200 opacity-60"
          : "border-slate-200"
      }`}
    >
      {/* Card Header Bar */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <span className={`text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-md border ${categoryColor}`}>
            {opportunity.category.replace("_", " ")}
          </span>
          <span className="text-xs text-slate-400">&bull;</span>
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{opportunity.kitchen.name}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Match Score Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Match Score: {opportunity.matchScore}</span>
          </div>

          {opportunity.status === "accepted" && (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Accepted</span>
            </span>
          )}

          {opportunity.status === "rejected" && (
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
              Declined
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Col 1: Food & Quantity Details */}
        <div className="space-y-3">
          {opportunity.signedImageUrl && (
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <Image
                src={opportunity.signedImageUrl}
                alt={opportunity.foodName}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-slate-900">{opportunity.foodName}</h3>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">
              {opportunity.quantity}{" "}
              <span className="text-xs font-medium text-slate-500 uppercase">{opportunity.unit}</span>
            </p>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{opportunity.kitchen.address}</span>
            </div>
            {opportunity.kitchen.contactPhone && (
              <div className="flex items-center gap-1 text-slate-500">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{opportunity.kitchen.contactPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Rescue Clock & Time Window */}
        <div className="space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block">
              Rescue Window
            </span>
            <RescueClock
              deadlineIso={opportunity.redistributionDeadline}
              initialClock={opportunity.rescueClock}
            />
          </div>

          <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex justify-between">
              <span>Reported:</span>
              <span className="text-slate-700 font-medium">
                {new Date(opportunity.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Deadline:</span>
              <span className="text-slate-700 font-medium">
                {opportunity.redistributionDeadline
                  ? new Date(opportunity.redistributionDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Col 3: Explainability & Actions */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block mb-2">
              Why You Were Matched
            </span>
            <div className="space-y-1.5">
              {opportunity.explainableReasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-1.5 text-xs text-slate-700 font-medium bg-purple-50/50 border border-purple-100 rounded-lg px-2.5 py-1.5"
                >
                  <span className="text-purple-600 font-bold">✓</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {actionError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{actionError}</span>
              </div>
            )}

            {isAvailable ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isAccepting || isRejecting}
                  onClick={handleAccept}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
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
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold transition disabled:opacity-50"
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
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Match accepted! Pickup request generated.</span>
              </div>
            ) : isExpired ? (
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500 font-semibold text-center">
                Rescue window expired
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Expandable Notes / Details Toggle */}
      {opportunity.notes && (
        <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="italic">Note: &ldquo;{opportunity.notes}&rdquo;</span>
        </div>
      )}
    </div>
  );
}
