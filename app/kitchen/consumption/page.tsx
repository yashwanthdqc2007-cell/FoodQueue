"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  Utensils,
  AlertCircle,
  CheckCircle2,
  PackagePlus,
  ArrowLeft,
  Loader2,
  Scale,
} from "lucide-react";
import { SurplusHandoffModal } from "@/components/kitchen/surplus-handoff-modal";
import { PageHeader } from "@/components/ui/page-header";

interface MealOption {
  id: string;
  kitchenId: string;
  mealName: string;
  mealDate: string;
  mealPeriod: string;
  plannedQuantity: number;
  expectedConsumers: number;
  unit: string;
  hasConsumptionRecorded: boolean;
}

function ConsumptionAuditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMealId = searchParams.get("mealId") || "";

  const [meals, setMeals] = useState<MealOption[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<string>(preselectedMealId);
  const [actualConsumers, setActualConsumers] = useState<number | "">("");
  const [preparedQuantity, setPreparedQuantity] = useState<number | "">("");
  const [consumedQuantity, setConsumedQuantity] = useState<number | "">("");
  const [leftoverQuantity, setLeftoverQuantity] = useState<number | "">("");

  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [showSurplusModal, setShowSurplusModal] = useState(false);

  // 1. Fetch available meals
  useEffect(() => {
    async function loadMeals() {
      try {
        const res = await fetch("/api/meals?limit=30");
        const json = await res.json();
        if (json.data?.meals) {
          const loadedMeals: MealOption[] = json.data.meals;
          setMeals(loadedMeals);
          const initialTarget = preselectedMealId
            ? loadedMeals.find((m) => m.id === preselectedMealId)
            : loadedMeals.find((m) => !m.hasConsumptionRecorded) || loadedMeals[0];

          if (initialTarget) {
            setSelectedMealId(initialTarget.id);
            setPreparedQuantity(initialTarget.plannedQuantity);
            setActualConsumers(initialTarget.expectedConsumers > 0 ? initialTarget.expectedConsumers : "");
          }
        }
      } catch (err) {
        console.error("Failed to load meals for consumption audit:", err);
      } finally {
        setIsLoadingMeals(false);
      }
    }
    loadMeals();
  }, [preselectedMealId]);

  const selectedMeal = meals.find((m) => m.id === selectedMealId);

  function handleSelectMeal(mealId: string) {
    setSelectedMealId(mealId);
    const target = meals.find((m) => m.id === mealId);
    if (target) {
      setPreparedQuantity(target.plannedQuantity);
      setActualConsumers(target.expectedConsumers > 0 ? target.expectedConsumers : "");
      setConsumedQuantity("");
      setLeftoverQuantity("");
    }
  }

  // 2. Live leftover helper
  function handleConsumedChange(val: number | "") {
    setConsumedQuantity(val);
    if (val !== "" && preparedQuantity !== "") {
      const calculatedLeftover = Math.max(0, Number(preparedQuantity) - Number(val));
      setLeftoverQuantity(Math.round(calculatedLeftover * 100) / 100);
    }
  }

  // Live validation checks
  const numPrepared = Number(preparedQuantity) || 0;
  const numConsumed = Number(consumedQuantity) || 0;
  const numLeftover = Number(leftoverQuantity) || 0;

  const isConsumedOverPrepared = numConsumed > numPrepared;
  const isLeftoverOverPrepared = numLeftover > numPrepared;
  const isSumOverTolerance = numConsumed + numLeftover > numPrepared * 1.05 + 0.001;

  // 4. Submit consumption audit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!selectedMealId) {
        throw new Error("Please select a meal service to audit");
      }

      const response = await fetch("/api/consumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealId: selectedMealId,
          actualConsumers: Number(actualConsumers),
          preparedQuantity: Number(preparedQuantity),
          consumedQuantity: Number(consumedQuantity),
          leftoverQuantity: Number(leftoverQuantity),
        }),
      });

      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error?.message || "Failed to record consumption audit");
      }

      setSuccessData(json.data);
      if (json.data.hasLeftover) {
        setShowSurplusModal(true);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Consumption audit failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingMeals) {
    return (
      <div className="max-w-2xl mx-auto p-16 text-center">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-2" />
        <p className="text-xs text-brand-muted font-medium">Loading meal audit roster...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Post-Service Consumption Audit"
        description="Verify mass-balance conservation: record actual consumer headcount, consumed portions, and leftover quantities."
        backHref="/kitchen"
        backLabel="Back to Kitchen Dashboard"
      />

      <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 shadow-md">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Validation Notice</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {successData ? (
          <div className="p-8 bg-brand-card border border-brand-primary/30 rounded-2xl text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-brand-mint mx-auto" />
            <div>
              <h3 className="text-base font-extrabold text-brand-text">Consumption Record Saved Successfully</h3>
              <p className="text-xs text-brand-muted mt-1">
                Audited: {successData.actualConsumers} consumers &bull; {successData.consumedQuantity} consumed &bull; {successData.leftoverQuantity} leftover
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {successData.hasLeftover && (
                <button
                  type="button"
                  onClick={() => setShowSurplusModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-xs transition"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Declare Surplus Handoff ({successData.leftoverQuantity})</span>
                </button>
              )}

              <Link
                href="/kitchen"
                className="px-4 py-2.5 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-text text-xs font-bold shadow-2xs transition"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Meal Selection */}
            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                Select Meal Service to Audit <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={selectedMealId}
                onChange={(e) => handleSelectMeal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card font-semibold"
              >
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.mealDate} &bull; {m.mealName} ({m.mealPeriod.toUpperCase()}) &bull; Planned: {m.plannedQuantity} {m.unit} {m.hasConsumptionRecorded ? "✓ (Audited)" : "— Pending Audit"}
                  </option>
                ))}
              </select>
            </div>

            {/* Audit Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                  Actual Consumers Served <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 790"
                  value={actualConsumers}
                  onChange={(e) => setActualConsumers(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                  Actual Prepared Quantity ({selectedMeal?.unit || "servings"}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={preparedQuantity}
                  onChange={(e) => setPreparedQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                  Consumed Quantity ({selectedMeal?.unit || "servings"}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 805"
                  value={consumedQuantity}
                  onChange={(e) => handleConsumedChange(e.target.value === "" ? "" : Number(e.target.value))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-brand-text focus:outline-none focus:ring-2 bg-brand-card ${
                    isConsumedOverPrepared ? "border-rose-500 focus:ring-rose-500 bg-rose-950/20 text-rose-300" : "border-brand-border focus:ring-brand-primary"
                  }`}
                />
                {isConsumedOverPrepared && (
                  <span className="text-[11px] text-rose-400 mt-1 block">Consumed quantity cannot exceed prepared quantity</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-1.5">
                  Leftover Quantity ({selectedMeal?.unit || "servings"}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 45"
                  value={leftoverQuantity}
                  onChange={(e) => setLeftoverQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold text-brand-text focus:outline-none focus:ring-2 bg-brand-card ${
                    isLeftoverOverPrepared || isSumOverTolerance ? "border-rose-500 focus:ring-rose-500 bg-rose-950/20 text-rose-300" : "border-brand-border focus:ring-brand-primary"
                  }`}
                />
                {isSumOverTolerance && (
                  <span className="text-[11px] text-rose-400 mt-1 block">Consumed + Leftover exceeds prepared quantity (&gt;5% tolerance)</span>
                )}
              </div>
            </div>

            {/* Mass Conservation Live Check Card */}
            <div className="p-4 rounded-xl bg-brand-card border border-brand-border text-xs text-brand-text space-y-2">
              <div className="font-bold text-brand-text flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-brand-mint" />
                <span>Deterministic Mass-Balance Check</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Total Prepared:</span>
                <strong>{numPrepared} {selectedMeal?.unit}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Consumed ({numConsumed}) + Leftover ({numLeftover}):</span>
                <strong className={isSumOverTolerance ? "text-rose-400 font-bold" : "text-brand-mint font-bold"}>
                  {numConsumed + numLeftover} {selectedMeal?.unit}
                </strong>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-3">
              <Link
                href="/kitchen"
                className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-muted hover:text-brand-text hover:bg-brand-card transition"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting || isConsumedOverPrepared || isLeftoverOverPrepared || isSumOverTolerance}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording Audit...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Consumption Audit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Surplus Handoff Modal */}
      {selectedMeal && (
        <SurplusHandoffModal
          isOpen={showSurplusModal}
          onClose={() => setShowSurplusModal(false)}
          onSuccess={(surplusId) => {
            router.push(`/kitchen`);
          }}
          kitchenId={selectedMeal.kitchenId}
          sourceMealId={selectedMeal.id}
          mealName={selectedMeal.mealName}
          leftoverQuantity={Number(leftoverQuantity) || 0}
          unit={selectedMeal.unit}
        />
      )}
    </div>
  );
}

export default function ConsumptionAuditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-brand-muted">Loading audit view...</div>}>
      <ConsumptionAuditContent />
    </Suspense>
  );
}
