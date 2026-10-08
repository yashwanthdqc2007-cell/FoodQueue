import { z } from "zod";

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

export type CreateSurplusHandoffInput = z.infer<typeof createSurplusHandoffSchema>;
