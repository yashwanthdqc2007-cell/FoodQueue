"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  MapPin,
  Phone,
  Clock,
  Sparkles,
  PackageCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { OpportunityItem } from "@/components/receiver/opportunity-card";
import { RescueClock } from "@/components/kitchen/rescue-clock";

export default function ReceiverMatchesPage() {
  const [matches, setMatches] = useState<OpportunityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadAcceptedMatches() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/receiver/opportunities?status=accepted");
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load accepted matches");
          }
          setMatches(json.data.opportunities || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching matches");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadAcceptedMatches();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/receiver"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Opportunities</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Accepted Redistribution Matches</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Surplus food batches your organization has accepted for recovery and redistribution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="text-xs font-semibold text-slate-600">Loading accepted matches...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-700">
          {errorMsg}
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <PackageCheck className="w-10 h-10 text-slate-300" />
          <h3 className="text-base font-bold text-slate-900">No accepted matches yet</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            When you accept matched surplus opportunities from the opportunities feed, they will appear here.
          </p>
          <Link
            href="/receiver"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs hover:bg-purple-700 transition"
          >
            <span>Browse Opportunities</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {matches.map((m) => (
            <div
              key={m.matchId}
              className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition space-y-4"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-tight border border-emerald-200">
                    Accepted Match
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{m.foodName}</h3>
                  <p className="text-xs text-slate-500">{m.kitchen.name}</p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-extrabold text-slate-900">
                    {m.quantity} <span className="text-xs font-normal text-slate-500">{m.unit}</span>
                  </span>
                  <div className="text-[11px] text-purple-700 font-bold mt-0.5">
                    Score: {m.matchScore}
                  </div>
                </div>
              </div>

              {/* Kitchen Location & Contact */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1.5 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{m.kitchen.address}</span>
                </div>
                {m.kitchen.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{m.kitchen.contactPhone}</span>
                  </div>
                )}
              </div>

              {/* Rescue Clock */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                  Rescue Clock
                </span>
                <RescueClock
                  deadlineIso={m.redistributionDeadline}
                  initialClock={m.rescueClock}
                />
              </div>

              {/* Reasons */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
                  Match Rationale
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {m.explainableReasons.map((r, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
