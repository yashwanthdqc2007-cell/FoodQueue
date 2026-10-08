import { z } from "zod";

export const mealPeriodEnum = z.enum(["breakfast", "lunch", "dinner", "snack", "other"]);

export const createMealSchema = z.object({
  kitchenId: z.string().uuid("Invalid kitchen UUID"),
  mealName: z.string().trim().min(2, "Meal name must be at least 2 characters").max(100, "Meal name cannot exceed 100 characters"),
  mealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Meal date must be in YYYY-MM-DD format"),
  mealPeriod: mealPeriodEnum,
  expectedConsumers: z.number().int("Expected consumers must be an integer").nonnegative("Expected consumers cannot be negative"),
  plannedQuantity: z.number().positive("Planned quantity must be greater than zero"),
  unit: z.string().trim().min(1, "Unit cannot be empty").max(30, "Unit cannot exceed 30 characters").default("servings"),
});

export const updateMealSchema = z.object({
  mealName: z.string().trim().min(2).max(100).optional(),
  mealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Meal date must be in YYYY-MM-DD format").optional(),
  mealPeriod: mealPeriodEnum.optional(),
  expectedConsumers: z.number().int().nonnegative().optional(),
  plannedQuantity: z.number().positive().optional(),
  unit: z.string().trim().min(1).max(30).optional(),
});

export const mealQuerySchema = z.object({
  kitchenId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mealPeriod: mealPeriodEnum.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type MealQueryInput = z.infer<typeof mealQuerySchema>;
