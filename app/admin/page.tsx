"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ChefHat,
  HeartHandshake,
  Leaf,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Info,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import type { AdminAnalyticsSummary } from "@/lib/analytics/admin";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [data, setData] = useState<AdminAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadAdminData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/analytics/admin?period=${period}`);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load system analytics");
          }
          setData(json.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching admin analytics");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadAdminData();

    return () => {
      ignore = true;
    };
  }, [period, refreshKey]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-mint">
              System Administration
            </span>
            <span className="text-brand-border">&bull;</span>
            <span className="text-xs text-brand-muted font-medium">Cross-Facility Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">
            Ecosystem Overview &amp; Analytics
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-2xl leading-relaxed">
            Real-time multi-organization operations, verified surplus redistribution handovers, and aggregate environmental ESG metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {/* Period selector */}
          <div className="bg-brand-surface p-1 rounded-xl flex items-center gap-1 border border-brand-border text-xs font-bold shadow-2xs">
            {(["7d", "30d", "90d", "all"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  period === p
                    ? "bg-brand-primary text-white shadow-xs font-bold"
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
            className="p-2 rounded-xl bg-brand-card border border-brand-border hover:bg-brand-surface text-brand-muted hover:text-brand-text shadow-2xs transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <span className="text-xs font-semibold text-brand-muted">Aggregating cross-organization ecosystem telemetry...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-6 text-center text-xs text-rose-300 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : !data ? (
        <EmptyState
          icon={Calendar}
          title="No Platform Data Available"
          description="Ecosystem telemetry will appear here once organizations record operations."
        />
      ) : (
        <div className="space-y-8">
          {/* 1. Ecosystem Health KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Registered Organizations"
              value={data.ecosystem.totalOrganizations}
              unit="entities"
              subtitle="Total active facility profiles"
              icon={Building2}
              variant="forest"
            />

            <KpiCard
              title="Donor Kitchens"
              value={data.ecosystem.totalKitchens}
              unit="kitchens"
              subtitle="Registered meal producers"
              icon={ChefHat}
              variant="primary"
            />

            <KpiCard
              title="Community Receivers"
              value={data.ecosystem.totalReceivers}
              unit="NGOs"
              subtitle={`${data.ecosystem.verifiedReceivers} verified partners`}
              icon={HeartHandshake}
              variant="violet"
            />

            <KpiCard
              title="Completed Pickups"
              value={data.operations.completedPickupsCount}
              unit="handovers"
              subtitle="Audited physical collections"
              icon={CheckCircle2}
              variant="mint"
            />
          </div>

          {/* 2. Cumulative Environmental Impact Banner */}
          <div className="bg-gradient-to-r from-brand-card via-brand-surface to-[#162d22] text-brand-text rounded-3xl p-6 sm:p-8 shadow-sm border border-brand-border relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="max-w-md">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/20 text-brand-mint text-[11px] font-bold uppercase tracking-wider border border-brand-primary/30">
                  <Leaf className="w-3.5 h-3.5 text-brand-mint" />
                  <span>Estimated Platform Environmental Impact</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-2.5 tracking-tight text-brand-text">Cumulative Food Rescue Summary</h2>
                <p className="text-xs sm:text-sm text-brand-muted mt-1 leading-relaxed">
                  Total food diverted from landfills across all institutional mess facilities and redistributed to vulnerable community recipients.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-brand-surface/80 backdrop-blur-xs rounded-2xl p-4 border border-brand-border">
                  <span className="text-[10px] uppercase font-bold text-brand-muted block">Food Rescued</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-text">{data.impact.totalFoodSavedKg} kg</span>
                  <span className="text-[10px] text-brand-muted block mt-0.5">Verified handovers</span>
                </div>

                <div className="bg-brand-surface/80 backdrop-blur-xs rounded-2xl p-4 border border-brand-border">
                  <span className="text-[10px] uppercase font-bold text-brand-muted block">Estimated Meals</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-mint">{data.impact.estimatedMealsSaved}</span>
                  <span className="text-[10px] text-brand-muted block mt-0.5">@ 0.4 kg / portion</span>
                </div>

                <div className="bg-brand-surface/80 backdrop-blur-xs rounded-2xl p-4 border border-brand-border">
                  <span className="text-[10px] uppercase font-bold text-brand-muted block">CO₂e Avoided</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-mint">{data.impact.estimatedCo2eAvoidedKg} kg</span>
                  <span className="text-[10px] text-brand-muted block mt-0.5">@ 2.5 kg CO₂e / kg</span>
                </div>

                <div className="bg-brand-surface/80 backdrop-blur-xs rounded-2xl p-4 border border-brand-border">
                  <span className="text-[10px] uppercase font-bold text-brand-muted block">Value Diverted</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-300">₹{data.impact.estimatedValueSavedInr.toLocaleString()}</span>
                  <span className="text-[10px] text-amber-400/80 block mt-0.5">@ ₹60 / kg standard</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-brand-border flex items-center gap-2 text-[11px] text-brand-muted">
              <Info className="w-3.5 h-3.5 shrink-0 text-brand-mint" />
              <span>
                Verified handovers represent physical collections with proof of handover. Environmental and economic outcomes are calculated deterministically using recognized food-loss standards.
              </span>
            </div>
          </div>

          {/* 3. Top Donor Kitchens & Top Community Receivers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Donor Kitchens */}
            <div className="glass-card rounded-2xl p-6 border border-brand-border bg-brand-surface space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-brand-primary" />
                  <span>Top Donor Kitchens</span>
                </h3>
                <span className="text-xs font-semibold text-brand-muted">By Verified Weight</span>
              </div>

              {data.topDonorKitchens.length === 0 ? (
                <div className="text-center py-8 text-xs text-brand-muted bg-brand-card/40 rounded-xl border border-dashed border-brand-border">
                  No completed donor distributions recorded in this timeframe.
                </div>
              ) : (
                <div className="divide-y divide-brand-border text-xs">
                  {data.topDonorKitchens.map((k, idx) => (
                    <div key={k.kitchenId} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-primary/20 text-brand-mint font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-brand-text block text-sm">{k.name}</span>
                          <span className="text-[11px] text-brand-muted">{k.completedPickups} pickups completed</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-brand-mint block text-sm">{k.foodSavedKg} kg</span>
                        <span className="text-[10px] text-brand-muted">rescued</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Receivers */}
            <div className="glass-card rounded-2xl p-6 border border-brand-border bg-brand-surface space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-brand-mint" />
                  <span>Top Community Partners</span>
                </h3>
                <span className="text-xs font-semibold text-brand-muted">By Intake Volume</span>
              </div>

              {data.topReceivers.length === 0 ? (
                <div className="text-center py-8 text-xs text-brand-muted bg-brand-card/40 rounded-xl border border-dashed border-brand-border">
                  No receiver collections completed in this timeframe.
                </div>
              ) : (
                <div className="divide-y divide-brand-border text-xs">
                  {data.topReceivers.map((r, idx) => (
                    <div key={r.receiverId} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-primary/20 text-brand-mint font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-brand-text block text-sm">{r.name}</span>
                          <span className="text-[11px] text-brand-muted capitalize">{r.type} &bull; {r.completedPickups} collections</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-brand-mint block text-sm">{r.foodCollectedKg} kg</span>
                        <span className="text-[10px] text-brand-muted">received</span>
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
