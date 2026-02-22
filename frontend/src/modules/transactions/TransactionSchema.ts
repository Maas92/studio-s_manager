import { z } from "zod";

// Schemas
export const TransactionTypeSchema = z.enum(["sale", "purchase", "adjustment"]);

export const TransactionSchema = z.object({
  id: z.string(),
  type: TransactionTypeSchema,
  date: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      sku: z.string().optional(),
      quantity: z.number(),
      unit: z.string().optional(),
      cost: z.coerce.number().optional(),
      retailPrice: z.coerce.number().optional(),
    }),
  ),
  totalCost: z.coerce.number().optional(),
  totalRetailPrice: z.coerce.number().optional(),
  notes: z.string().nullable().optional(),
});

export const CreateTransactionSchema = z.object({
  type: TransactionTypeSchema,
  date: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      sku: z.string().optional(),
      quantity: z.number(),
      unit: z.string().optional(),
      cost: z.coerce.number().optional(),
      retailPrice: z.coerce.number().optional(),
    }),
  ),
  notes: z.string().nullable().optional(),
});

// Types
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
