import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Utensils,
  Calendar,
  Clock,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
  ArrowLeft,
  Users,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import type { MealModel } from "@/types/models";

interface MealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MealDetailPage({ params }: MealDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: meals, error } = await supabase
    .from("meals")
    .select(`
      id,
      kitchen_id,
      meal_name,
      meal_date,
      meal_period,
      expected_consumers,
      planned_quantity,
      unit,
      created_at,
      kitchens (
        id,
        name,
        address
      ),
      consumption_records (
        id,
        actual_consumers,
        prepared_quantity,
        consumed_quantity,
        leftover_quantity,
        recorded_at
      ),
      surplus_items (
        id,
        food_name,
        quantity,
        unit,
        status,
        category,
        redistribution_deadline,
        reported_at
      )
    `)
    .eq("id", id)
    .returns<(MealModel & { kitchens: { id: string; name: string; address?: string | null } })[]>();

  const meal = meals?.[0];
  if (error || !meal) {
    notFound();
  }

  const consumption = meal.consumption_records?.[0] || null;
  const surplusItems = meal.surplus_items || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/kitchen"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Kitchen Hub</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">Meal ID: {meal.id.slice(0, 8)}</span>
      </div>

      {/* Main Meal Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 mt-0.5">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {meal.meal_period}
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {meal.meal_date}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{meal.meal_name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{meal.kitchens?.name || "Kitchen Service"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {consumption ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>Audited Service</span>
              </span>
            ) : (
              <Link
                href={`/kitchen/consumption?mealId=${meal.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Audit Consumption</span>
              </Link>
            )}
          </div>
        </div>

        {/* Planning Target Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Planned Preparation</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {meal.planned_quantity} <span className="text-xs font-normal text-slate-500">{meal.unit}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Expected Headcount</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {meal.expected_consumers} <span className="text-xs font-normal text-slate-500">pax</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Service Shift</div>
            <div className="text-lg font-bold text-slate-900 capitalize mt-0.5">{meal.meal_period}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Measurement Unit</div>
            <div className="text-lg font-bold text-slate-900 capitalize mt-0.5">{meal.unit}</div>
          </div>
        </div>
      </div>

      {/* Consumption Audit Record Section */}
      {consumption ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Post-Service Consumption Audit</h2>
            </div>
            <span className="text-xs text-slate-400">
              Recorded: {new Date(consumption.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500">Actual Consumers</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {consumption.actual_consumers} <span className="text-xs font-normal text-slate-500">served</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="text-[11px] font-medium text-blue-800">Actual Prepared</div>
              <div className="text-xl font-bold text-blue-900 mt-1">
                {consumption.prepared_quantity} <span className="text-xs font-normal text-blue-700">{meal.unit}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-[11px] font-medium text-emerald-800">Consumed Quantity</div>
              <div className="text-xl font-bold text-emerald-900 mt-1">
                {consumption.consumed_quantity} <span className="text-xs font-normal text-emerald-700">{meal.unit}</span>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              Number(consumption.leftover_quantity) > 0
                ? "bg-amber-50/70 border-amber-200 text-amber-900"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}>
              <div className="text-[11px] font-medium text-amber-800">Remaining Leftovers</div>
              <div className="text-xl font-bold mt-1">
                {consumption.leftover_quantity} <span className="text-xs font-normal">{meal.unit}</span>
              </div>
            </div>
          </div>

          {/* Leftover Action / Surplus Handoff Trigger */}
          {Number(consumption.leftover_quantity) > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-900">
                    {consumption.leftover_quantity} {meal.unit} of edible food remaining
                  </div>
                  <div className="text-[11px] text-amber-700">
                    Declare surplus to hand off to nearby community receivers before safe rescue window expires.
                  </div>
                </div>
              </div>

              <Link
                href={`/kitchen/consumption?mealId=${meal.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition shrink-0"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Declare Surplus Handoff</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Consumption Not Yet Audited</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Once the dining period concludes, log actual consumers and food consumed to verify leftovers and train the demand forecasting baseline.
            </p>
          </div>
          <Link
            href={`/kitchen/consumption?mealId=${meal.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Perform Consumption Audit</span>
          </Link>
        </div>
      )}

      {/* Linked Surplus Handoff Items */}
      {surplusItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Linked Surplus Items ({surplusItems.length})</h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {surplusItems.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{s.food_name}</span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Quantity: <strong>{s.quantity} {s.unit}</strong> &bull; Category: <span className="capitalize">{s.category}</span>
                  </div>
                </div>

                <span className="font-semibold uppercase text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
