import { z } from "zod";
import { mealPeriodEnum } from "./meal";

export const demandPredictionPostSchema = z.object({
  kitchenId: z.string().uuid("Invalid kitchen UUID"),
  predictionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Prediction date must be in YYYY-MM-DD format"),
  mealPeriod: mealPeriodEnum,
  expectedConsumers: z.number().int().nonnegative().optional(),
  unit: z.string().trim().min(1).max(30).default("servings"),
  baselinePortionRatio: z.number().positive("Baseline portion ratio must be positive").optional(),
});

export const demandPredictionQuerySchema = z.object({
  kitchenId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mealPeriod: mealPeriodEnum.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type DemandPredictionPostInput = z.infer<typeof demandPredictionPostSchema>;
export type DemandPredictionQueryInput = z.infer<typeof demandPredictionQuerySchema>;
