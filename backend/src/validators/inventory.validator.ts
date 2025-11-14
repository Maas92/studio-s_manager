import { z } from "zod";

// Schema for adjusting inventory
export const adjustInventorySchema = z.object({
  body: z.object({
    product_id: z.string().uuid("Invalid product ID"),
    location_id: z.string().uuid("Invalid location ID"),
    quantity_change: z
      .number({ error: "Quantity change is required" })
      .int("Quantity change must be an integer")
      .refine((val) => val !== 0, {
        message: "Quantity change cannot be zero",
      }),
    reason: z
      .string()
      .max(500, "Reason must be less than 500 characters")
      .optional(),
    batch_number: z
      .string()
      .max(120, "Batch number must be less than 120 characters")
      .nullable()
      .optional(),
    expiry_date: z
      .string()
      .datetime({ message: "Invalid date format. Use ISO 8601 format" })
      .nullable()
      .optional(),
  }),
});

// Schema for transferring stock
export const transferStockSchema = z.object({
  body: z
    .object({
      product_id: z.string().uuid("Invalid product ID"),
      from_location_id: z.string().uuid("Invalid source location ID"),
      to_location_id: z.string().uuid("Invalid destination location ID"),
      quantity: z
        .number({ error: "Quantity is required" })
        .int("Quantity must be an integer")
        .positive("Quantity must be greater than zero"),
      reason: z
        .string()
        .max(500, "Reason must be less than 500 characters")
        .optional(),
      batch_number: z
        .string()
        .max(120, "Batch number must be less than 120 characters")
        .nullable()
        .optional(),
    })
    .refine((data) => data.from_location_id !== data.to_location_id, {
      message: "Source and destination locations must be different",
      path: ["to_location_id"],
    }),
});

// Schema for inventory levels query
export const inventoryLevelsQuerySchema = z.object({
  query: z.object({
    location_id: z.string().uuid("Invalid location ID").optional(),
    product_id: z.string().uuid("Invalid product ID").optional(),
    low_stock: z.enum(["true", "false"]).optional(),
    batch_number: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
