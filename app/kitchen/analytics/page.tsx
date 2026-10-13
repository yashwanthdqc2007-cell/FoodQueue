"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Leaf,
  Sparkles,
  Info,
  RefreshCw,
  Loader2,
  ChefHat,
  ArrowRight,
  ShieldCheck,
  Scale,
  Zap,
} from "lucide-react";
import type { KitchenAnalyticsSummary } from "@/lib/analytics/kitchen";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function KitchenAnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [data, setData] = useState<KitchenAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/analytics/kitchen?period=${period}`);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load kitchen analytics");
          }
          setData(json.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error loading analytics data");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      ignore = true;
    };
  }, [period, refreshKey]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header & Period Selector */}
      <PageHeader
        title="Kitchen Waste &amp; Impact Intelligence"
        description="Real-time post-service audit telemetry, demand forecasting accuracy, leftover patterns, and verified redistribution impact."
        backHref="/kitchen"
        backLabel="Back to Kitchen Dashboard"
        actions={
          <div className="flex items-center gap-2.5">
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
              className="p-2.5 rounded-xl bg-brand-card border border-brand-border hover:bg-brand-surface text-brand-muted hover:text-brand-text shadow-2xs transition"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Main Content State */}
      {isLoading ? (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <span className="text-xs font-semibold text-brand-muted">Calculating kitchen analytics &amp; waste insights...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-6 text-center text-xs text-rose-300">
          {errorMsg}
        </div>
      ) : !data ? (
        <EmptyState
          icon={BarChart3}
          title="No Analytics Data Available"
          description="Analytics will populate once meal services and consumption audits are recorded."
        />
      ) : (
        <div className="space-y-8">
          {/* 1. Core Operational KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Meal Services"
              value={data.overview.totalMealsPlanned}
              unit="services"
              subtitle={`${data.overview.totalMealsAudited} audited • ${data.overview.mealsAwaitingAudit} pending`}
              icon={ChefHat}
              variant="forest"
            />

            <KpiCard
              title="Recorded Leftovers"
              value={data.overview.totalRecordedLeftovers}
              unit="units"
              subtitle={`Leftover rate: ${data.overview.overallLeftoverRate}%`}
              icon={Scale}
              variant={data.overview.overallLeftoverRate <= 10 ? "primary" : "amber"}
            />

            <KpiCard
              title="Food Rescued"
              value={data.impact.totalFoodSavedKg}
              unit="kg"
              subtitle={`${data.overview.totalCompletedPickups} completed pickups`}
              icon={Sparkles}
              variant="violet"
            />

            <KpiCard
              title="Active Surplus"
              value={data.overview.totalActiveSurplusBatches}
              unit="batches"
              subtitle={`${data.overview.totalActiveSurplusKg} kg available`}
              icon={Clock}
              variant="mint"
            />
          </div>

          {/* 2. Estimated Impact Dashboard Banner */}
          <div className="bg-gradient-to-r from-brand-card via-brand-surface to-[#152e22] text-brand-text rounded-3xl p-6 sm:p-8 shadow-sm border border-brand-border relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="max-w-md">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/20 text-brand-mint text-[11px] font-bold uppercase tracking-wider border border-brand-primary/30">
                  <Leaf className="w-3.5 h-3.5 text-brand-mint" />
                  <span>Estimated Environmental &amp; Social Impact</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-2.5 tracking-tight text-brand-text">Community Food Diversion Totals</h2>
                <p className="text-xs sm:text-sm text-brand-muted mt-1 leading-relaxed">
                  Cumulative impact generated from completed collections with verified local non-profit partners.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-brand-surface/80 backdrop-blur-xs rounded-2xl p-4 border border-brand-border">
                  <span className="text-[10px] uppercase font-bold text-brand-muted block">Food Rescued</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-text">{data.impact.totalFoodSavedKg} kg</span>
                  <span className="text-[10px] text-brand-muted block mt-0.5">Direct scale weight</span>
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
                  <span className="text-[10px] uppercase font-bold text-brand-muted block">Estimated Value</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-300">₹{data.impact.estimatedValueSavedInr.toLocaleString()}</span>
                  <span className="text-[10px] text-amber-400/80 block mt-0.5">@ ₹60 / kg standard</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-brand-border flex items-center gap-2 text-[11px] text-brand-muted">
              <Info className="w-3.5 h-3.5 shrink-0 text-brand-mint" />
              <span>
                Calculations use documented conversion constants (0.4 kg/meal, 2.5 kg CO₂e/kg, ₹60/kg) as defined in system specifications.
              </span>
            </div>
          </div>

          {/* 3. Deterministic Data-Driven Waste Insights */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Deterministic Operational Insights</span>
              </h3>
              <span className="text-xs text-brand-muted font-medium">Based on audited post-service logs</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-extrabold text-brand-text">{insight.title}</h4>
                      <span className="text-xs font-black text-brand-mint bg-brand-primary/20 px-2.5 py-0.5 rounded-full border border-brand-primary/30 shrink-0">
                        {insight.metricValue}
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted mt-2 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-brand-border text-[10px] text-brand-muted font-medium">
                    <strong>Basis:</strong> {insight.calculationBasis}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Telemetry Breakdown: Meal Periods & Surplus Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meal Period Leftover Analysis */}
            <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                  Leftover Rate by Meal Period
                </h3>
                <span className="text-xs text-brand-muted font-medium">Prepared vs. Leftovers</span>
              </div>

              {data.mealPeriodBreakdown.length === 0 ? (
                <div className="text-center py-8 text-xs text-brand-muted bg-brand-card/40 rounded-xl border border-dashed border-brand-border">
                  No audited meal services found in this period.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {data.mealPeriodBreakdown.map((item) => (
                    <div key={item.period} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-brand-text capitalize">{item.period} ({item.mealCount} meals)</span>
                        <span className="text-brand-muted font-bold">
                          {item.leftoverQuantity} / {item.preparedQuantity} units ({item.leftoverRate}%)
                        </span>
                      </div>
                      {/* Bar progress */}
                      <div className="w-full bg-brand-card h-2.5 rounded-full overflow-hidden border border-brand-border">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.leftoverRate <= 10
                              ? "bg-brand-primary"
                              : item.leftoverRate <= 20
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, item.leftoverRate))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Surplus Status Lifecycle Breakdown */}
            <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                  Surplus Batch Lifecycle
                </h3>
                <Link
                  href="/kitchen/surplus"
                  className="text-xs font-bold text-brand-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Surplus Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
                  <span className="text-[10px] text-amber-400 font-bold uppercase block">Active</span>
                  <span className="text-lg font-black text-brand-text mt-0.5 block">{data.surplusStatusCounts.active || 0}</span>
                </div>

                <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl">
                  <span className="text-[10px] text-blue-400 font-bold uppercase block">Matched</span>
                  <span className="text-lg font-black text-blue-300 mt-0.5 block">
                    {(data.surplusStatusCounts.matched || 0) + (data.surplusStatusCounts.pickup_pending || 0)}
                  </span>
                </div>

                <div className="bg-brand-primary/20 border border-brand-primary/30 p-3 rounded-xl">
                  <span className="text-[10px] text-brand-mint font-bold uppercase block">Collected</span>
                  <span className="text-lg font-black text-brand-text mt-0.5 block">{data.surplusStatusCounts.picked_up || 0}</span>
                </div>

                <div className="bg-brand-card border border-brand-border p-3 rounded-xl">
                  <span className="text-[10px] text-brand-muted font-bold uppercase block">Expired/Other</span>
                  <span className="text-lg font-black text-brand-muted mt-0.5 block">
                    {(data.surplusStatusCounts.expired || 0) + (data.surplusStatusCounts.disposed || 0) + (data.surplusStatusCounts.recovered || 0)}
                  </span>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="pt-2">
                <span className="text-xs font-bold text-brand-text block mb-2">Category Distribution:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(data.surplusCategoryCounts)
                    .filter(([_, count]) => count > 0)
                    .map(([cat, count]) => (
                      <Badge key={cat} variant="default" size="sm">
                        <span className="capitalize">{cat.replace("_", " ")}</span>: <strong>{count}</strong>
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Demand Prediction Performance vs Actuals */}
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-3.5">
              <div>
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                  Demand Prediction Accuracy vs. Audited Actuals
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Compares forecasted consumers from baseline demand models against post-service audited headcount.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="bg-brand-card border border-brand-border px-3.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-brand-muted font-semibold block">Mean Absolute Error (MAE)</span>
                  <span className="font-extrabold text-brand-text">{data.predictionPerformance.meanAbsoluteError} consumers</span>
                </div>
                {data.predictionPerformance.meanAbsolutePercentageError !== null && (
                  <div className="bg-brand-primary/20 border border-brand-primary/30 px-3.5 py-1.5 rounded-xl">
                    <span className="text-[10px] text-brand-mint font-bold block">Mean Error % (MAPE)</span>
                    <span className="font-extrabold text-brand-mint">{data.predictionPerformance.meanAbsolutePercentageError}%</span>
                  </div>
                )}
              </div>
            </div>

            {data.predictionPerformance.comparisons.length === 0 ? (
              <div className="text-center py-8 text-xs text-brand-muted bg-brand-card/40 rounded-xl border border-dashed border-brand-border">
                No matching prediction and audit pairs recorded for this timeframe.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-brand-border text-brand-muted font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Meal Period</th>
                      <th className="py-2.5 px-3">Predicted Consumers</th>
                      <th className="py-2.5 px-3">Actual Headcount</th>
                      <th className="py-2.5 px-3">Absolute Error</th>
                      <th className="py-2.5 px-3 text-right">Variance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border text-brand-text">
                    {data.predictionPerformance.comparisons.slice(0, 8).map((c, idx) => (
                      <tr key={idx} className="hover:bg-brand-card/60 transition">
                        <td className="py-3 px-3 font-semibold">{c.date}</td>
                        <td className="py-3 px-3 capitalize font-medium">{c.mealPeriod}</td>
                        <td className="py-3 px-3 font-bold text-blue-400">{c.predictedConsumers}</td>
                        <td className="py-3 px-3 font-bold text-brand-text">{c.actualConsumers}</td>
                        <td className="py-3 px-3 text-brand-muted font-medium">{c.absoluteError}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-brand-mint">
                          {c.percentageError !== null ? `${c.percentageError}%` : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
