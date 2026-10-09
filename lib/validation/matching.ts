import { z } from "zod";

export const matchStatusEnum = z.enum(["recommended", "accepted", "rejected", "expired"]);

export const generateMatchesSchema = z.object({
  surplusId: z.string().uuid("Invalid surplus UUID"),
});

export const matchActionSchema = z.object({
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export const matchQuerySchema = z.object({
  surplusId: z.string().uuid().optional(),
  receiverId: z.string().uuid().optional(),
  status: matchStatusEnum.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type GenerateMatchesInput = z.infer<typeof generateMatchesSchema>;
export type MatchActionInput = z.infer<typeof matchActionSchema>;
export type MatchQueryInput = z.infer<typeof matchQuerySchema>;
