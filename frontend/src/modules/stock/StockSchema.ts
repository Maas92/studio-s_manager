import { z } from "zod";

// Schemas
export const StockLocationSchema = z.enum(["retail", "treatment", "storage"]);

export const StockItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  category: z.string().optional(),
  location: StockLocationSchema,
  quantity: z.number(),
  minQuantity: z.number().optional(),
  unit: z.string().optional(),
  cost: z.coerce.number().optional(),
  retailPrice: z.coerce.number().optional(),
  supplier: z.string().optional(),
  notes: z.string().nullable().optional(),
  lastRestocked: z.string().optional(),
});

export const CreateStockItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  category: z.string().optional(),
  location: StockLocationSchema,
  quantity: z.number().min(0, "Quantity must be positive"),
  minQuantity: z.number().optional(),
  unit: z.string().optional(),
  cost: z.coerce.number().optional(),
  retailPrice: z.coerce.number().optional(),
  supplier: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export const TransferStockSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  fromLocation: StockLocationSchema,
  toLocation: StockLocationSchema,
  quantity: z.number().min(1, "Quantity must be at least 1"),
  notes: z.string().nullable().optional(),
});

// Types
export type StockLocation = z.infer<typeof StockLocationSchema>;
export type StockItem = z.infer<typeof StockItemSchema>;
export type CreateStockItemInput = z.infer<typeof CreateStockItemSchema>;
export type TransferStockInput = z.infer<typeof TransferStockSchema>;
