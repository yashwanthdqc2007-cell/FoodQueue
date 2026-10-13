"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  HeartHandshake,
  ChefHat,
  Leaf,
  CheckCircle2,
  Calendar,
  Clock,
  RefreshCw,
  Loader2,
  Info,
  ArrowRight,
  ShieldCheck,
  Scale,
  Utensils,
  IndianRupee,
} from "lucide-react";
import type { ReceiverAnalyticsSummary } from "@/lib/analytics/receiver";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";

export default function ReceiverImpactPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [data, setData] = useState<ReceiverAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadReceiverImpact() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/analytics/receiver?period=${period}`);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load receiver impact analytics");
          }
          setData(json.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error loading impact data");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadReceiverImpact();

    return () => {
      ignore = true;
    };
  }, [period, refreshKey]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-brand-text">
      {/* Header */}
      <PageHeader
        title="Community Food Rescue & Impact"
        description="Verified food redistribution received by your organization, meals served, and cumulative environmental savings."
        actions={
          <div className="flex items-center gap-2">
            <div className="bg-brand-surface p-1 rounded-xl flex items-center gap-1 border border-brand-border text-xs font-semibold">
              {(["7d", "30d", "90d", "all"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    period === p
                      ? "bg-brand-violet text-brand-forest-dark shadow-xs font-black"
                      : "text-brand-muted hover:text-brand-text"
                  }`}
                >
                  {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : p === "90d" ? "90 Days" : "All Time"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-2.5 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-card text-brand-text shadow-xs transition"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-brand-violet" />
          <span className="text-xs font-bold text-brand-muted">Loading your organization&apos;s impact history...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-brand-red-light border border-brand-red/30 rounded-2xl p-6 text-center text-xs text-brand-red">
          {errorMsg}
        </div>
      ) : !data || data.summary.totalPickupsCompleted === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No completed food rescue collections yet"
          description={`Your organization has not completed any food rescue pick-ups in the selected period (${period}). Once you complete collection of surplus items, estimated impact will appear here.`}
          action={{
            label: "Find Available Surplus",
            href: "/receiver",
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* 1. Core Impact Banner */}
          <div className="bg-gradient-to-r from-purple-950 via-[#1A2520] to-[#172D32] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-800/40 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="max-w-md">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider border border-purple-400/30">
                  <Sparkles className="w-3 h-3" />
                  <span>Estimated Receiver Impact</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-2">Food Distributed to Community</h2>
                <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
                  Total food collected from donor institutional kitchens across <strong className="text-white font-extrabold">{data.summary.totalPickupsCompleted} completed pickups</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-purple-200/80 block">Food Rescued</span>
                  <span className="text-xl font-black text-white">{data.summary.totalFoodCollectedKg} kg</span>
                  <span className="text-[9px] text-slate-300 block mt-0.5">Scale weight</span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-purple-200/80 block">Estimated Meals</span>
                  <span className="text-xl font-black text-purple-300">{data.summary.estimatedMealsProvided}</span>
                  <span className="text-[9px] text-purple-200/70 block mt-0.5">@ 0.4 kg / meal</span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-purple-200/80 block">CO₂e Avoided</span>
                  <span className="text-xl font-black text-teal-300">{data.summary.estimatedCo2eAvoidedKg} kg</span>
                  <span className="text-[9px] text-teal-200/70 block mt-0.5">@ 2.5 kg CO₂e/kg</span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-purple-200/80 block">Value Saved</span>
                  <span className="text-xl font-black text-amber-300">₹{data.summary.estimatedValueSavedInr.toLocaleString()}</span>
                  <span className="text-[9px] text-amber-200/70 block mt-0.5">@ ₹60 / kg</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center gap-2 text-[11px] text-purple-200/70">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Social and environmental impact metrics are estimated based on verified standard recovery formulas (0.4 kg/meal, 2.5 kg CO₂e/kg, ₹60/kg).
              </span>
            </div>
          </div>

          {/* 2. Donor Kitchen Partnerships & Recent Pickups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donor Kitchen Contributions */}
            <div className="glass-card bg-brand-card border border-brand-border rounded-2xl p-5 shadow-xs space-y-3 text-brand-text">
              <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-brand-primary" />
                <span>Partner Donor Kitchens</span>
              </h3>

              {data.donorKitchens.length === 0 ? (
                <div className="text-center py-6 text-xs text-brand-muted">
                  No completed collections recorded with partner kitchens yet.
                </div>
              ) : (
                <div className="divide-y divide-brand-border/60 text-xs">
                  {data.donorKitchens.map((k) => (
                    <div key={k.kitchenId} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-brand-text block">{k.kitchenName}</span>
                        <span className="text-[10px] text-brand-muted">{k.pickupCount} completed collections</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-brand-violet block">{k.foodCollectedKg} kg</span>
                        <span className="text-[10px] text-brand-muted">received</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Collections History */}
            <div className="glass-card bg-brand-card border border-brand-border rounded-2xl p-5 shadow-xs space-y-3 text-brand-text">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                  <span>Recent Collection Handover History</span>
                </h3>
                <Link
                  href="/receiver/pickups"
                  className="text-xs font-bold text-brand-violet hover:underline inline-flex items-center gap-1"
                >
                  <span>All Pickups</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data.recentCompletedPickups.length === 0 ? (
                <div className="text-center py-6 text-xs text-brand-muted">
                  No completed collections recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-brand-border/60 text-xs">
                  {data.recentCompletedPickups.map((p) => (
                    <div key={p.pickupId} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-brand-text block">{p.foodName}</span>
                        <span className="text-[10px] text-brand-muted">
                          {p.kitchenName} · {p.pickedUpAt ? new Date(p.pickedUpAt).toLocaleDateString() : "Completed"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-brand-primary block">{p.quantity} {p.unit}</span>
                        <span className="text-[9px] text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 px-2 py-0.5 rounded-full font-bold">
                          Verified Handover
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
