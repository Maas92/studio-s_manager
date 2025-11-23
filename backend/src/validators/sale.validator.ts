import { z } from "zod";

const CartItemSchema = z.object({
  id: z.string(),
  type: z.enum(["treatment", "product", "appointment"]),
  name: z.string(),
  price: z.number(), // Frontend sends number (dollars)
  quantity: z.number(),
  staffId: z.string().optional(),
  staffName: z.string().optional(),
  productId: z.string().optional(),
  treatmentId: z.string().optional(),
  appointmentId: z.string().optional(),
  discount: z.number().optional(), // Item level discount if any
});

const DiscountSchema = z.object({
  type: z.enum(["percentage", "fixed", "loyalty"]),
  value: z.number(),
  reason: z.string().optional(),
});

const PaymentBreakdownSchema = z.object({
  method: z.enum(["cash", "card", "loyalty", "gift-card"]),
  amount: z.number(),
  reference: z.string().optional(),
});

const TipsSchema = z.record(z.string(), z.number());

export const createSaleSchema = z.object({
  body: z.object({
    clientId: z.string().optional(),
    clientName: z.string().optional(), // In case of walk-in/new client
    items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
    discount: DiscountSchema,
    payments: z
      .array(PaymentBreakdownSchema)
      .min(1, "At least one payment method required"),
    tips: TipsSchema.optional(),
    loyaltyPointsRedeemed: z.number().optional(),
  }),
});
