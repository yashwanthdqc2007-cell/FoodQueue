import { z } from "zod";

export const createConsumptionSchema = z
  .object({
    mealId: z.string().uuid("Invalid meal UUID"),
    actualConsumers: z.number().int("Actual consumers must be an integer").nonnegative("Actual consumers cannot be negative"),
    preparedQuantity: z.number().nonnegative("Prepared quantity cannot be negative"),
    consumedQuantity: z.number().nonnegative("Consumed quantity cannot be negative"),
    leftoverQuantity: z.number().nonnegative("Leftover quantity cannot be negative"),
  })
  .refine((data) => data.consumedQuantity <= data.preparedQuantity, {
    message: "Consumed quantity cannot exceed prepared quantity",
    path: ["consumedQuantity"],
  })
  .refine((data) => data.leftoverQuantity <= data.preparedQuantity, {
    message: "Leftover quantity cannot exceed prepared quantity",
    path: ["leftoverQuantity"],
  })
  .refine(
    (data) => {
      // 5% measurement tolerance guard
      return data.consumedQuantity + data.leftoverQuantity <= data.preparedQuantity * 1.05 + 0.001;
    },
    {
      message: "Sum of consumed and leftover exceeds prepared quantity by more than 5% tolerance",
      path: ["leftoverQuantity"],
    }
  )
  .refine(
    (data) => {
      if (data.actualConsumers === 0) {
        return data.consumedQuantity === 0 && data.leftoverQuantity === data.preparedQuantity;
      }
      return true;
    },
    {
      message: "When actual consumers is zero, consumed quantity must be 0 and leftovers must equal prepared quantity",
      path: ["actualConsumers"],
    }
  );

export type CreateConsumptionInput = z.infer<typeof createConsumptionSchema>;
