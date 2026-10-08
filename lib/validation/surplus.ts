import { z } from "zod";

export const surplusCategoryEnum = z.enum([
  "edible_surplus",
  "reusable",
  "organic",
  "unsafe",
  "unknown",
]);

export const surplusStatusEnum = z.enum([
  "active",
  "matched",
  "pickup_pending",
  "picked_up",
  "expired",
  "recovered",
  "disposed",
]);

export const createSurplusHandoffSchema = z.object({
  kitchenId: z.string().uuid("Invalid kitchen UUID"),
  sourceMealId: z.string().uuid("Invalid source meal UUID"),
  foodName: z.string().trim().min(2, "Food name must be at least 2 characters").max(100, "Food name cannot exceed 100 characters"),
  quantity: z.number().positive("Surplus quantity must be greater than zero"),
  unit: z.string().trim().min(1, "Unit cannot be empty").max(30, "Unit cannot exceed 30 characters").default("kg"),
  preparedAt: z.string().optional().nullable(),
  redistributionDeadline: z.string().optional().nullable(),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().nullable(),
});

export const aiClassificationRequestSchema = z.object({
  surplusId: z.string().uuid("Invalid surplus UUID"),
  notes: z.string().max(500, "Advisory notes cannot exceed 500 characters").optional(),
});

export const aiStructuredOutputSchema = z.object({
  foodType: z.string().trim().min(1, "Food type is required").max(100),
  category: surplusCategoryEnum,
  visibleCondition: z.string().trim().min(1, "Visible condition description is required").max(300),
  confidence: z.number().min(0, "Confidence must be between 0 and 1").max(1, "Confidence must be between 0 and 1"),
  notes: z.string().max(1000).optional().default(""),
});

export const updateSurplusSchema = z.object({
  status: surplusStatusEnum.optional(),
  category: surplusCategoryEnum.optional(),
  notes: z.string().max(1000).optional().nullable(),
  redistributionDeadline: z.string().optional().nullable(),
});

export const surplusQuerySchema = z.object({
  kitchenId: z.string().uuid().optional(),
  status: surplusStatusEnum.optional(),
  category: surplusCategoryEnum.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreateSurplusHandoffInput = z.infer<typeof createSurplusHandoffSchema>;
export type AiClassificationRequestInput = z.infer<typeof aiClassificationRequestSchema>;
export type AiStructuredOutput = z.infer<typeof aiStructuredOutputSchema>;
export type UpdateSurplusInput = z.infer<typeof updateSurplusSchema>;
export type SurplusQueryInput = z.infer<typeof surplusQuerySchema>;
