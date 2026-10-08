import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Calendar,
  PlusCircle,
  ClipboardCheck,
  PackagePlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Utensils,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { MealModel, SurplusItemModel, KitchenModel, ProfileModel } from "@/types/models";

export default async function KitchenDashboardPage() {
  const supabase = await createClient();

  // 1. Get current user & profile
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", userId!)
    .returns<ProfileModel[]>();

  const profile = profiles?.[0];

  // 2. Fetch kitchen for organization
  let kitchenQuery = supabase.from("kitchens").select("*").eq("active", true);
  if (profile?.role !== "admin" && profile?.organization_id) {
    kitchenQuery = kitchenQuery.eq("organization_id", profile.organization_id);
  }

  const { data: kitchens } = await kitchenQuery.returns<KitchenModel[]>();
  const kitchen = kitchens?.[0] || null;

  if (!kitchen) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-amber-900">No Active Kitchen Assigned</h2>
        <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
          Your organization does not have an active kitchen facility provisioned yet. Please contact an administrator to complete setup.
        </p>
      </div>
    );
  }

  // 3. Query all meals for this kitchen
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: meals } = await supabase
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
        status,
        quantity,
        unit,
        category
      )
    `)
    .eq("kitchen_id", kitchen.id)
    .order("meal_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<MealModel[]>();

  const allMeals = meals || [];

  // Categorize meals
  const todaysMeals = allMeals.filter((m) => m.meal_date === todayStr);
  const upcomingMeals = allMeals.filter((m) => m.meal_date > todayStr);
  const pastMeals = allMeals.filter((m) => m.meal_date < todayStr);
  const awaitingAudit = pastMeals.filter((m) => !m.consumption_records || m.consumption_records.length === 0);

  // 4. Query active surplus items
  const { data: surplusData } = await supabase
    .from("surplus_items")
    .select("*")
    .eq("kitchen_id", kitchen.id)
    .order("reported_at", { ascending: false })
    .limit(10)
    .returns<SurplusItemModel[]>();

  const surplusList = surplusData || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Active Facility
            </span>
            <span className="text-xs text-slate-400 font-mono">Timezone: {kitchen.timezone}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{kitchen.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{kitchen.address || "Institutional Kitchen Operations"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/kitchen/meals/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Plan New Meal</span>
          </Link>

          <Link
            href="/kitchen/consumption"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span>Record Consumption</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Today&apos;s Services</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{todaysMeals.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{todayStr}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Awaiting Audit</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{awaitingAudit.length}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Past un-audited meals</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Upcoming Scheduled</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{upcomingMeals.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Planned for future dates</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Declared Surplus</span>
            <PackagePlus className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{surplusList.length}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Active redistribution items</div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today & Upcoming Meals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Meals Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Today&apos;s Meal Services</h2>
              </div>
              <span className="text-xs text-slate-400">{todayStr}</span>
            </div>

            {todaysMeals.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Meals Planned for Today</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Plan an upcoming service to enable forecasting and audits.</p>
                <Link
                  href="/kitchen/meals/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Plan Today&apos;s Meal</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysMeals.map((meal) => {
                  const consumption = meal.consumption_records?.[0];
                  return (
                    <div
                      key={meal.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{meal.meal_name}</span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {meal.meal_period}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span>Planned: <strong>{meal.planned_quantity} {meal.unit}</strong></span>
                          <span>Expected: <strong>{meal.expected_consumers} pax</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {consumption ? (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Audited ({consumption.leftover_quantity} {meal.unit} leftover)</span>
                            </span>
                          </div>
                        ) : (
                          <Link
                            href={`/kitchen/consumption?mealId=${meal.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>Audit Post-Service</span>
                          </Link>
                        )}

                        <Link
                          href={`/kitchen/meals/${meal.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Audit Alert Card (if any) */}
          {awaitingAudit.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Past Services Needing Consumption Audits ({awaitingAudit.length})</span>
                </div>
              </div>

              <div className="space-y-2">
                {awaitingAudit.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-white rounded-xl border border-amber-200/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{m.meal_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {m.meal_date} &bull; <span className="capitalize">{m.meal_period}</span> &bull; Planned {m.planned_quantity} {m.unit}
                      </div>
                    </div>

                    <Link
                      href={`/kitchen/consumption?mealId=${m.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition"
                    >
                      <ClipboardCheck className="w-3 h-3" />
                      <span>Audit Now</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Schedule */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Upcoming Planned Meals</h2>
              </div>
              <Link href="/kitchen/meals/new" className="text-xs font-medium text-emerald-600 hover:underline">
                + Schedule
              </Link>
            </div>

            {upcomingMeals.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No upcoming meals scheduled.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingMeals.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{m.meal_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {m.meal_date} &bull; <span className="capitalize">{m.meal_period}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-slate-800">{m.planned_quantity} {m.unit}</div>
                      <div className="text-[10px] text-slate-400">{m.expected_consumers} pax</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Active Surplus Handoffs & Predictive Intelligence Note */}
        <div className="space-y-6">
          {/* Surplus Handoff List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Declared Surplus Items</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{surplusList.length} items</span>
            </div>

            {surplusList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                <PackagePlus className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p>No active surplus declared.</p>
                <p className="text-[10px] mt-0.5">Leftover food reported during consumption audit appears here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {surplusList.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-slate-900">{item.food_name}</span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {item.status}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1">
                      Quantity: <strong>{item.quantity} {item.unit}</strong>
                    </div>
                    {item.redistribution_deadline && (
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Deadline: {new Date(item.redistribution_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intelligence Engine Status Card */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Deterministic Prediction Engine</span>
            </div>
            <h4 className="text-sm font-bold">`mvp-baseline-v1` Active</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Forecasting combines 50% same-weekday, 30% recent 7-day, and 20% same-shift historical moving averages with a 3% preparation safety buffer.
            </p>
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Zero AI in baseline estimation</span>
              <span className="text-emerald-400 font-medium">100% Deterministic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
