"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  PackageCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  Calendar,
  ArrowRight,
} from "lucide-react";
import type { OpportunityItem } from "@/components/receiver/opportunity-card";
import { RescueClock } from "@/components/kitchen/rescue-clock";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-brand-text">
      {/* Header */}
      <PageHeader
        title="Accepted Redistribution Matches"
        description="Surplus food batches accepted by your organization awaiting pickup scheduling or collection handover."
        backHref="/receiver"
        backLabel="Back to Marketplace"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/receiver/pickups"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-violet hover:bg-brand-violet/90 text-brand-forest-dark text-xs font-extrabold shadow-xs transition"
            >
              <Calendar className="w-4 h-4" />
              <span>Go to Pickups</span>
            </Link>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-card text-xs font-bold text-brand-text shadow-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-brand-violet" />
          <span className="text-xs font-bold text-brand-muted">Loading accepted matches...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-brand-red-light border border-brand-red/30 rounded-2xl p-6 text-center text-xs text-brand-red">
          {errorMsg}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No accepted matches yet"
          description="When you accept matched surplus opportunities from the surplus feed, they will appear here ready for coordination."
          action={{
            label: "Browse Marketplace Feed",
            href: "/receiver",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {matches.map((m) => (
            <div
              key={m.matchId}
              className="glass-card bg-brand-card border border-brand-border rounded-2xl p-5 shadow-xs hover:border-brand-violet/40 transition space-y-4"
            >
              <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 uppercase tracking-tight border border-emerald-700/50">
                    Accepted Match
                  </span>
                  <h3 className="text-base font-bold text-brand-text mt-1.5">{m.foodName}</h3>
                  <p className="text-xs font-semibold text-brand-muted">{m.kitchen.name}</p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-brand-text">
                    {m.quantity} <span className="text-xs font-bold text-brand-muted uppercase">{m.unit}</span>
                  </span>
                  <div className="text-[11px] text-brand-violet font-extrabold mt-0.5">
                    Match Score: {m.matchScore}
                  </div>
                </div>
              </div>

              {/* Kitchen Location & Contact */}
              <div className="bg-brand-surface rounded-xl p-3 text-xs text-brand-muted space-y-1.5 border border-brand-border">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-muted shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{m.kitchen.address}</span>
                </div>
                {m.kitchen.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-muted shrink-0" />
                    <span>{m.kitchen.contactPhone}</span>
                  </div>
                )}
              </div>

              {/* Rescue Clock */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-brand-muted uppercase tracking-wider block">
                  Redistribution Deadline
                </span>
                <RescueClock
                  deadlineIso={m.redistributionDeadline}
                  initialClock={m.rescueClock}
                />
              </div>

              {/* Reasons & Action */}
              <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {m.explainableReasons.slice(0, 2).map((r, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold bg-brand-surface text-brand-text px-2 py-0.5 rounded-md border border-brand-border"
                    >
                      {r}
                    </span>
                  ))}
                </div>

                <Link
                  href="/receiver/pickups"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-violet hover:text-purple-300"
                >
                  <span>Coordinate Pickup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
