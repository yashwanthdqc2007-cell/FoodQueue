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
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Leaf,
} from "lucide-react";
import { RescueClock } from "@/components/kitchen/rescue-clock";
import { computeRescueClock } from "@/lib/rules/rescue-clock";
import type { MealModel, SurplusItemModel, KitchenModel, ProfileModel } from "@/types/models";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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
      <EmptyState
        icon={AlertCircle}
        title="No Active Kitchen Assigned"
        description="Your organization does not have an active kitchen facility provisioned yet. Please contact an administrator to complete setup."
        action={{
          label: "Return to Main Hub",
          href: "/dashboard",
        }}
      />
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
    <div className="space-y-8">
      {/* Top Banner / Actions */}
      <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="primary" size="sm">
              Active Facility
            </Badge>
            <span className="text-xs text-brand-muted font-medium">Timezone: {kitchen.timezone}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">{kitchen.name}</h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>{kitchen.address || "Institutional Food Service Facility"}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/kitchen/meals/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Plan New Meal</span>
          </Link>

          <Link
            href="/kitchen/consumption"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-text text-xs sm:text-sm font-bold shadow-2xs transition"
          >
            <ClipboardCheck className="w-4 h-4 text-brand-primary" />
            <span>Record Consumption</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Today's Meal Services"
          value={todaysMeals.length}
          unit="services"
          subtitle={todayStr}
          icon={Calendar}
          variant="forest"
        />

        <KpiCard
          title="Awaiting Mass-Balance Audit"
          value={awaitingAudit.length}
          unit="past meals"
          subtitle="Past un-audited services"
          icon={AlertCircle}
          variant="amber"
        />

        <KpiCard
          title="Upcoming Scheduled"
          value={upcomingMeals.length}
          unit="planned"
          subtitle="Future production schedules"
          icon={Clock}
          variant="primary"
        />

        <KpiCard
          title="Active Declared Surplus"
          value={surplusList.length}
          unit="batches"
          subtitle="In rescue lifecycle"
          icon={Sparkles}
          variant="violet"
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today & Upcoming Meals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Meals Section */}
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-brand-border pb-3.5">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-brand-primary" />
                <h2 className="text-sm font-bold text-brand-text">Today&apos;s Meal Services</h2>
              </div>
              <span className="text-xs font-semibold text-brand-muted">{todayStr}</span>
            </div>

            {todaysMeals.length === 0 ? (
              <div className="text-center py-8 bg-brand-card/40 rounded-xl border border-dashed border-brand-border">
                <Calendar className="w-8 h-8 text-brand-muted mx-auto mb-2" />
                <p className="text-xs font-bold text-brand-text">No Meals Planned for Today</p>
                <p className="text-[11px] text-brand-muted mt-0.5">Plan an upcoming service to enable forecasting and audits.</p>
                <Link
                  href="/kitchen/meals/new"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 mt-3 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover transition shadow-2xs"
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
                      className="p-4 rounded-xl border border-brand-border hover:border-brand-primary/40 hover:bg-brand-card/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-card"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-brand-text">{meal.meal_name}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-surface text-brand-muted border border-brand-border">
                            {meal.meal_period}
                          </span>
                        </div>
                        <div className="text-xs text-brand-muted mt-1 flex flex-wrap items-center gap-3">
                          <span>Planned: <strong className="text-brand-text">{meal.planned_quantity} {meal.unit}</strong></span>
                          <span>&bull;</span>
                          <span>Expected: <strong className="text-brand-text">{meal.expected_consumers} pax</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {consumption ? (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-mint bg-brand-primary/20 px-2.5 py-1 rounded-full border border-brand-primary/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Audited ({consumption.leftover_quantity} {meal.unit} leftover)</span>
                            </span>
                          </div>
                        ) : (
                          <Link
                            href={`/kitchen/consumption?mealId=${meal.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold transition shadow-2xs"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>Audit Post-Service</span>
                          </Link>
                        )}

                        <Link
                          href={`/kitchen/meals/${meal.id}`}
                          className="p-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-surface transition border border-transparent hover:border-brand-border"
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
            <div className="bg-amber-950/25 border border-amber-800/40 rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Past Services Requiring Consumption Audits ({awaitingAudit.length})</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {awaitingAudit.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 bg-brand-surface rounded-xl border border-amber-800/30 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-brand-text">{m.meal_name}</div>
                      <div className="text-[11px] text-brand-muted mt-0.5">
                        {m.meal_date} &bull; <span className="capitalize">{m.meal_period}</span> &bull; Planned {m.planned_quantity} {m.unit}
                      </div>
                    </div>

                    <Link
                      href={`/kitchen/consumption?mealId=${m.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>Audit Now</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Schedule */}
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-brand-border pb-3.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-primary" />
                <h2 className="text-sm font-bold text-brand-text">Upcoming Planned Meals</h2>
              </div>
              <Link href="/kitchen/meals/new" className="text-xs font-bold text-brand-primary hover:underline">
                + Schedule Service
              </Link>
            </div>

            {upcomingMeals.length === 0 ? (
              <p className="text-xs text-brand-muted py-4 text-center">No upcoming meals scheduled.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingMeals.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-brand-border hover:border-brand-primary/30 flex items-center justify-between text-xs bg-brand-card"
                  >
                    <div>
                      <div className="font-bold text-brand-text">{m.meal_name}</div>
                      <div className="text-[11px] text-brand-muted">
                        {m.meal_date} &bull; <span className="capitalize">{m.meal_period}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-brand-text">{m.planned_quantity} {m.unit}</div>
                      <div className="text-[10px] text-brand-muted">{m.expected_consumers} pax</div>
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
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-3.5">
            <div className="flex items-center justify-between border-b border-brand-border pb-3.5">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-brand-text">Declared Surplus Items</h3>
              </div>
              <Link href="/kitchen/surplus" className="text-xs font-bold text-brand-primary hover:underline">
                View All ({surplusList.length})
              </Link>
            </div>

            {surplusList.length === 0 ? (
              <div className="text-center py-8 text-brand-muted text-xs bg-brand-card/40 rounded-xl border border-dashed border-brand-border">
                <PackagePlus className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-brand-muted" />
                <p className="font-bold text-brand-text">No active surplus declared</p>
                <p className="text-[10px] mt-0.5 text-brand-muted">Leftover food reported during consumption audit appears here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {surplusList.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/kitchen/surplus/${item.id}`}
                    className="p-3.5 rounded-xl bg-brand-card hover:bg-brand-card/80 border border-brand-border text-xs block transition"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-brand-text">{item.food_name}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-mint border border-brand-primary/30">
                        {item.status}
                      </span>
                    </div>
                    <div className="text-brand-muted mt-1.5 flex items-center justify-between">
                      <span>Qty: <strong className="text-brand-text">{item.quantity} {item.unit}</strong></span>
                      <RescueClock deadlineIso={item.redistribution_deadline} compact />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Intelligence Engine Status Card */}
          <div className="bg-gradient-to-br from-brand-surface to-brand-card text-brand-text rounded-2xl p-6 shadow-md space-y-3.5 border border-brand-border">
            <div className="flex items-center gap-2 text-brand-mint text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-brand-mint" />
              <span>Deterministic Prediction Engine</span>
            </div>
            <h4 className="text-base font-extrabold tracking-tight">`mvp-baseline-v1` Active</h4>
            <p className="text-xs text-brand-muted leading-relaxed">
              Forecasting combines 50% same-weekday, 30% recent 7-day, and 20% same-shift historical moving averages with a 3% preparation safety buffer.
            </p>
            <div className="pt-3 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-muted">
              <span>Zero AI in baseline volume</span>
              <span className="text-brand-mint font-bold">100% Deterministic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
