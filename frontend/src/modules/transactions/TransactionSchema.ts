import { z } from "zod";

export const TransactionSchema = z.object({
  id: z.string(),

  // Client
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),

  // Financials — DB returns numeric strings, coerce to number
  subtotal: z.coerce.number().default(0),
  discountAmount: z.coerce.number().default(0),
  loyaltyValue: z.coerce.number().default(0),
  tax: z.coerce.number().default(0),
  tipsTotal: z.coerce.number().default(0),
  total: z.coerce.number().default(0),
  loyaltyPointsEarned: z.coerce.number().default(0),
  loyaltyPointsRedeemed: z.coerce.number().default(0),

  // Payment method
  paymentMethod: z.string().optional().nullable(),
  paymentStatus: z.string().optional().nullable(),

  // Status
  status: z
    .enum(["pending", "completed", "cancelled", "refunded"])
    .default("completed"),

  // Notes / reference
  notes: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),

  // Timestamps
  createdAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
});

// Types
export type Transaction = z.infer<typeof TransactionSchema>;
