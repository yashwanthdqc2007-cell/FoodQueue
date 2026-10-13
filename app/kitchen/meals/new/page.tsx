"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Utensils,
  Calendar,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { PredictionCard } from "@/components/kitchen/prediction-card";
import type { DemandPredictionResult } from "@/lib/prediction/baseline";
import { PageHeader } from "@/components/ui/page-header";

export default function NewMealPage() {
  const router = useRouter();

  const [kitchenId, setKitchenId] = useState<string>("");
  const [kitchenName, setKitchenName] = useState<string>("");
  const [mealName, setMealName] = useState("");
  const [mealDate, setMealDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealPeriod, setMealPeriod] = useState<"breakfast" | "lunch" | "dinner" | "snack" | "other">("lunch");
  const [unit, setUnit] = useState("servings");
  const [expectedConsumers, setExpectedConsumers] = useState<number | "">("");
  const [plannedQuantity, setPlannedQuantity] = useState<number | "">("");
  const [baselinePortionRatio, setBaselinePortionRatio] = useState<number | "">("");

  const [prediction, setPrediction] = useState<DemandPredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch user's active kitchen on mount
  useEffect(() => {
    async function loadKitchen() {
      try {
        const res = await fetch("/api/profile");
        const json = await res.json();
        if (json.data?.kitchen?.id) {
          setKitchenId(json.data.kitchen.id);
          setKitchenName(json.data.kitchen.name);
        } else {
          // If kitchen not directly embedded in profile, query meals to find kitchen
          const mealsRes = await fetch("/api/meals?limit=1");
          const mealsJson = await mealsRes.json();
          if (mealsJson.data?.meals?.[0]?.kitchenId) {
            setKitchenId(mealsJson.data.meals[0].kitchenId);
          }
        }
      } catch (err) {
        console.error("Failed to load user kitchen context:", err);
      }
    }
    loadKitchen();
  }, []);

  // 2. Compute live baseline demand prediction
  useEffect(() => {
    let ignore = false;
    if (!kitchenId || !mealDate || !mealPeriod) return;

    async function fetchPrediction() {
      setIsPredicting(true);
      try {
        const response = await fetch("/api/predictions/demand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kitchenId,
            predictionDate: mealDate,
            mealPeriod,
            expectedConsumers: expectedConsumers === "" ? undefined : Number(expectedConsumers),
            unit,
            baselinePortionRatio: baselinePortionRatio === "" ? undefined : Number(baselinePortionRatio),
          }),
        });

        const json = await response.json();
        if (!ignore && response.ok && json.data) {
          setPrediction(json.data);
        }
      } catch (err) {
        console.error("Prediction fetch error:", err);
      } finally {
        if (!ignore) {
          setIsPredicting(false);
        }
      }
    }

    fetchPrediction();

    return () => {
      ignore = true;
    };
  }, [kitchenId, mealDate, mealPeriod, unit, expectedConsumers, baselinePortionRatio]);

  async function handleManualRecalculate() {
    if (!kitchenId || !mealDate || !mealPeriod) return;
    setIsPredicting(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/predictions/demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchenId,
          predictionDate: mealDate,
          mealPeriod,
          expectedConsumers: expectedConsumers === "" ? undefined : Number(expectedConsumers),
          unit,
          baselinePortionRatio: baselinePortionRatio === "" ? undefined : Number(baselinePortionRatio),
        }),
      });

      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error?.message || "Failed to generate demand prediction");
      }

      setPrediction(json.data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Prediction calculation failed");
    } finally {
      setIsPredicting(false);
    }
  }

  // Apply recommendation from prediction card
  function handleApplyRecommendation(quantity: number, consumers: number) {
    setPlannedQuantity(quantity);
    if (expectedConsumers === "") {
      setExpectedConsumers(consumers);
    }
  }

  // 3. Submit Meal Creation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!kitchenId) {
        throw new Error("No active kitchen facility found for your account");
      }

      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchenId,
          mealName: mealName.trim(),
          mealDate,
          mealPeriod,
          expectedConsumers: expectedConsumers === "" ? 0 : Number(expectedConsumers),
          plannedQuantity: Number(plannedQuantity),
          unit: unit.trim() || "servings",
        }),
      });

      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error?.message || "Failed to schedule meal");
      }

      router.push(`/kitchen/meals/${json.data.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create meal");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Plan Upcoming Meal Service"
        description="Schedule cooking volumes with transparent, deterministic historical demand forecasting."
        backHref="/kitchen"
        backLabel="Back to Kitchen Dashboard"
        actions={
          kitchenName ? (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-brand-surface border border-brand-border text-brand-text">
              {kitchenName}
            </span>
          ) : undefined
        }
      />

      <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 shadow-md">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Unable to schedule service</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                Meal Name / Menu Description <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wednesday Lunch Service, Special Dinner"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-medium text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                  Service Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                  Meal Period <span className="text-rose-400">*</span>
                </label>
                <select
                  value={mealPeriod}
                  onChange={(e) => setMealPeriod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Predictive Demand Engine Component */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-brand-text flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-mint" />
                <span>Deterministic Predictive Guidance</span>
              </span>

              <button
                type="button"
                onClick={handleManualRecalculate}
                disabled={isPredicting}
                className="text-xs text-brand-mint hover:text-brand-primary font-bold inline-flex items-center gap-1 transition"
              >
                {isPredicting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Recalculate Baseline</span>
              </button>
            </div>

            <PredictionCard
              prediction={prediction}
              unit={unit}
              onApplyRecommended={handleApplyRecommendation}
              isLoading={isPredicting}
            />
          </div>

          {/* Planning Quantities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                Expected Consumers (Pax)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 800"
                value={expectedConsumers}
                onChange={(e) => setExpectedConsumers(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-medium text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card"
              />
              <span className="text-[10px] text-brand-muted mt-1 block">Expected headcount for shift</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                Planned Quantity to Cook <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 850"
                value={plannedQuantity}
                onChange={(e) => setPlannedQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card"
              />
              <span className="text-[10px] text-brand-muted mt-1 block">Target preparation volume</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                Unit of Measure <span className="text-rose-400">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card"
              >
                <option value="servings">Servings (portions)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="litres">Litres (L)</option>
                <option value="trays">Trays</option>
                <option value="boxes">Boxes</option>
              </select>
              <span className="text-[10px] text-brand-muted mt-1 block">Measurement unit for audit</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-brand-border flex items-center justify-end gap-3">
            <Link
              href="/kitchen"
              className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-muted hover:text-brand-text hover:bg-brand-card transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || plannedQuantity === "" || Number(plannedQuantity) <= 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scheduling Meal...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Schedule Meal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
