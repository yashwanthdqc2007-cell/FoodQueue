import { z } from "zod";

export const pickupStatusEnum = z.enum(["requested", "scheduled", "picked_up", "cancelled"]);

export const createPickupSchema = z.object({
  surplusId: z.string().uuid("Invalid surplus UUID"),
  receiverId: z.string().uuid("Invalid receiver UUID"),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
});

export const updatePickupStatusSchema = z.object({
  status: pickupStatusEnum,
  scheduledAt: z.string().datetime().optional().nullable(),
  pickedUpAt: z.string().datetime().optional().nullable(),
  proofImagePath: z.string().max(500).optional().nullable(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
});

export const pickupQuerySchema = z.object({
  status: pickupStatusEnum.optional(),
  surplusId: z.string().uuid().optional(),
  receiverId: z.string().uuid().optional(),
  kitchenId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreatePickupInput = z.infer<typeof createPickupSchema>;
export type UpdatePickupStatusInput = z.infer<typeof updatePickupStatusSchema>;
export type PickupQueryInput = z.infer<typeof pickupQuerySchema>;
