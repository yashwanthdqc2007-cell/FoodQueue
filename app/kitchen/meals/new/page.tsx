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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/kitchen"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        {kitchenName && <span className="text-xs text-slate-400 font-medium">{kitchenName}</span>}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Plan Upcoming Meal Service</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Schedule cooking volumes with deterministic historical demand forecasting
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Unable to proceed</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meal Name / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wednesday Lunch Service, Special Dinner"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meal Period <span className="text-rose-500">*</span>
                </label>
                <select
                  value={mealPeriod}
                  onChange={(e) => setMealPeriod(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Predictive Demand Guidance</span>
              </span>

              <button
                type="button"
                onClick={handleManualRecalculate}
                disabled={isPredicting}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
              >
                {isPredicting && <Loader2 className="w-3 h-3 animate-spin" />}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Consumers (Pax)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 800"
                value={expectedConsumers}
                onChange={(e) => setExpectedConsumers(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Expected headcount for shift</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planned Quantity to Cook <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 850"
                value={plannedQuantity}
                onChange={(e) => setPlannedQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Target preparation volume</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measure <span className="text-rose-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="servings">Servings (portions)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="litres">Litres (L)</option>
                <option value="trays">Trays</option>
                <option value="boxes">Boxes</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Measurement unit for audit</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/kitchen"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || plannedQuantity === "" || Number(plannedQuantity) <= 0}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
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
