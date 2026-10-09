"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Package,
  Layers,
  HeartHandshake,
} from "lucide-react";
import { OpportunityCard, type OpportunityItem } from "@/components/receiver/opportunity-card";

export default function ReceiverDashboardPage() {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"recommended" | "all">("recommended");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function fetchOpportunities() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/receiver/opportunities?status=${filterTab}`);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load opportunities");
          }
          setOpportunities(json.data.opportunities || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching opportunities");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchOpportunities();

    return () => {
      ignore = true;
    };
  }, [filterTab, refreshKey]);

  const activeCount = opportunities.filter(
    (o) => o.status === "recommended" && !o.rescueClock.isExpired
  ).length;

  const urgentCount = opportunities.filter(
    (o) => o.status === "recommended" && o.rescueClock.status === "URGENT" && !o.rescueClock.isExpired
  ).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Smart AI Redistribution Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Community Food Rescue Feed
            </h1>
            <p className="text-purple-200/80 text-xs sm:text-sm max-w-xl leading-relaxed">
              Review edible surplus batches matching your intake capacity, dietary criteria, and operational distance in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/receiver/matches"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-xs transition"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Accepted Matches</span>
            </Link>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] text-purple-200/70 font-semibold uppercase tracking-wider block">
              Available Matches
            </span>
            <span className="text-2xl font-black text-white mt-1 block">{activeCount}</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] text-purple-200/70 font-semibold uppercase tracking-wider block">
              Urgent Rescues
            </span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">{urgentCount}</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-purple-200/70 font-semibold uppercase tracking-wider block">
              Redistribution Mode
            </span>
            <span className="text-xs font-bold text-emerald-300 mt-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Deterministic Scored</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Content Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterTab("recommended")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              filterTab === "recommended"
                ? "bg-purple-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            Recommended Opportunities ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              filterTab === "all"
                ? "bg-purple-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            All Incoming Matches
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {opportunities.length} candidate batches
        </span>
      </div>

      {/* Main Feed Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="text-xs font-semibold text-slate-600">
            Checking real-time institutional kitchen surplus opportunities...
          </span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-700">
          {errorMsg}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-4 rounded-full bg-purple-50 text-purple-600">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No active surplus matches right now</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            When partner institutional kitchens report surplus food compatible with your intake criteria, matched opportunities will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((item) => (
            <OpportunityCard
              key={item.matchId}
              opportunity={item}
              onActionComplete={() => setRefreshKey((k) => k + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
