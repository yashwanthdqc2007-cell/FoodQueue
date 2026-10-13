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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PageHeader
        title={meal.meal_name}
        description={`Service scheduled for ${meal.meal_date} (${meal.meal_period.toUpperCase()}) at ${meal.kitchens?.name || "Kitchen Service"}.`}
        backHref="/kitchen"
        backLabel="Back to Kitchen Dashboard"
        badge={
          consumption ? (
            <Badge variant="primary" size="md" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
              Audited Service
            </Badge>
          ) : (
            <Badge variant="amber" size="md" icon={<Clock className="w-3.5 h-3.5" />}>
              Pending Audit
            </Badge>
          )
        }
        actions={
          !consumption ? (
            <Link
              href={`/kitchen/consumption?mealId=${meal.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-xs transition"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Audit Consumption</span>
            </Link>
          ) : undefined
        }
      />

      {/* Planning Target Stats */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
          Scheduled Targets
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-brand-card border border-brand-border">
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Planned Preparation</div>
            <div className="text-xl font-black text-brand-text mt-1">
              {meal.planned_quantity} <span className="text-xs font-semibold text-brand-muted">{meal.unit}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand-card border border-brand-border">
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Expected Headcount</div>
            <div className="text-xl font-black text-brand-text mt-1">
              {meal.expected_consumers} <span className="text-xs font-semibold text-brand-muted">pax</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand-card border border-brand-border">
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Service Shift</div>
            <div className="text-xl font-black text-brand-text capitalize mt-1">{meal.meal_period}</div>
          </div>

          <div className="p-4 rounded-xl bg-brand-card border border-brand-border">
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Measurement Unit</div>
            <div className="text-xl font-black text-brand-text capitalize mt-1">{meal.unit}</div>
          </div>
        </div>
      </div>

      {/* Consumption Audit Record Section */}
      {consumption ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3.5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-brand-primary" />
              <h2 className="text-base font-extrabold text-brand-text">Post-Service Mass-Balance Audit</h2>
            </div>
            <span className="text-xs text-brand-muted font-medium">
              Recorded: {new Date(consumption.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-brand-card border border-brand-border">
              <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Actual Consumers</div>
              <div className="text-2xl font-black text-brand-text mt-1">
                {consumption.actual_consumers} <span className="text-xs font-semibold text-brand-muted">served</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-brand-card border border-brand-border">
              <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Actual Prepared</div>
              <div className="text-2xl font-black text-brand-text mt-1">
                {consumption.prepared_quantity} <span className="text-xs font-semibold text-brand-muted">{meal.unit}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-brand-forest/25 border border-brand-forest/40">
              <div className="text-[11px] font-bold text-brand-mint uppercase tracking-wider">Consumed Quantity</div>
              <div className="text-2xl font-black text-brand-text mt-1">
                {consumption.consumed_quantity} <span className="text-xs font-semibold text-brand-primary">{meal.unit}</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${
              Number(consumption.leftover_quantity) > 0
                ? "bg-brand-amber/15 border-brand-amber/35 text-brand-text"
                : "bg-brand-card border-brand-border text-brand-text"
            }`}>
              <div className="text-[11px] font-bold text-brand-amber uppercase tracking-wider">Remaining Leftovers</div>
              <div className="text-2xl font-black mt-1">
                {consumption.leftover_quantity} <span className="text-xs font-semibold text-brand-muted">{meal.unit}</span>
              </div>
            </div>
          </div>

          {/* Leftover Action / Surplus Handoff Trigger */}
          {Number(consumption.leftover_quantity) > 0 && (
            <div className="mt-4 p-5 rounded-xl bg-brand-amber/10 border border-brand-amber/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-brand-amber shrink-0" />
                <div>
                  <div className="text-xs font-bold text-brand-text">
                    {consumption.leftover_quantity} {meal.unit} of safe edible food remaining
                  </div>
                  <div className="text-[11px] text-brand-muted mt-0.5">
                    Declare surplus to hand off to nearby community receivers before safe rescue window expires.
                  </div>
                </div>
              </div>

              <Link
                href={`/kitchen/consumption?mealId=${meal.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-amber hover:bg-amber-600 text-brand-bg text-xs font-bold shadow-xs transition shrink-0"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Declare Surplus Handoff</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-brand-surface border border-dashed border-brand-border rounded-2xl p-8 text-center space-y-3">
          <Clock className="w-10 h-10 text-brand-muted mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-brand-text">Consumption Not Yet Audited</h3>
            <p className="text-xs text-brand-muted mt-1 max-w-md mx-auto">
              Once the dining period concludes, log actual consumers and food consumed to verify leftovers and train the demand forecasting baseline.
            </p>
          </div>
          <Link
            href={`/kitchen/consumption?mealId=${meal.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-xs font-bold shadow-xs transition"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Perform Consumption Audit</span>
          </Link>
        </div>
      )}

      {/* Linked Surplus Handoff Items */}
      {surplusItems.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3.5">
            <div className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-brand-primary" />
              <h2 className="text-base font-extrabold text-brand-text">Linked Surplus Items ({surplusItems.length})</h2>
            </div>
          </div>

          <div className="divide-y divide-brand-border">
            {surplusItems.map((s) => (
              <div key={s.id} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-brand-text text-sm">{s.food_name}</span>
                  <div className="text-[11px] text-brand-muted mt-0.5">
                    Quantity: <strong className="text-brand-text">{s.quantity} {s.unit}</strong> &bull; Category: <span className="capitalize">{s.category}</span>
                  </div>
                </div>

                <Badge variant="primary" size="sm">
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
