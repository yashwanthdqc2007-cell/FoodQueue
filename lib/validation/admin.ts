import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string({ required_error: "Organization name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  organizationType: z.enum(
    ["kitchen", "receiver", "institution", "ngo", "processing_unit"],
    { required_error: "Valid organization type is required" }
  ),
  address: z.string().trim().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  contactPhone: z.string().trim().optional().nullable(),
  kitchen: z
    .object({
      name: z.string().trim().min(2, "Kitchen name must be at least 2 characters"),
      timezone: z.string().default("Asia/Kolkata"),
    })
    .optional()
    .nullable(),
  receiver: z
    .object({
      receiverType: z.enum(["ngo", "shelter", "hostel", "community_center", "other"]),
      maxCapacity: z.number().positive("Capacity must be greater than 0"),
      acceptedFoodTypes: z.array(z.string()).default([]),
      operatingHours: z.record(z.string()).default({}),
    })
    .optional()
    .nullable(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const assignUserSchema = z.object({
  userId: z.string().uuid("Target userId must be a valid UUID"),
  organizationId: z.string().uuid("Target organizationId must be a valid UUID"),
  role: z.enum(["kitchen", "receiver", "admin"], {
    required_error: "Valid app_role is required",
  }),
});

export type AssignUserInput = z.infer<typeof assignUserSchema>;
