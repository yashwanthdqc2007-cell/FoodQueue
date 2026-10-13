import { z } from "zod";

export const analyticsPeriodEnum = z.enum(["7d", "30d", "90d", "all"]).default("30d");

export const analyticsQuerySchema = z.object({
  period: analyticsPeriodEnum.optional().default("30d"),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  kitchenId: z.string().uuid().optional().nullable(),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

/**
 * Resolves a date range filter into ISO timestamp bounds.
 */
export function resolveDateRange(query: {
  period?: "7d" | "30d" | "90d" | "all";
  startDate?: string | null;
  endDate?: string | null;
}): { startIso: string | null; endIso: string } {
  const now = new Date();
  const endIso = query.endDate ? new Date(query.endDate).toISOString() : now.toISOString();

  if (query.startDate) {
    return {
      startIso: new Date(query.startDate).toISOString(),
      endIso,
    };
  }

  const period = query.period || "30d";
  if (period === "all") {
    return { startIso: null, endIso };
  }

  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    startIso: startDate.toISOString(),
    endIso,
  };
}
