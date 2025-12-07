import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

// Cart Item Schema
export const CartItemSchema = z.object({
  id: z.string(),
  type: z.enum(["treatment", "product", "appointment"]),
  name: z.string(),
  price: z.number(),
  originalPrice: z.number(),
  quantity: z.number(),
  maxQuantity: z.number().optional(),
  appointmentId: z.string().optional(),
  clientName: z.string().optional(),
  treatmentId: z.string().optional(),
  productId: z.string().optional(),
  staffId: z.string().optional(),
  staffName: z.string().optional(),
  duration: z.number().optional(),
  notes: z.string().optional(),
  isAppointmentCheckin: z.boolean().optional(),
  locked: z.boolean().optional(),
});

// Discount Schema
export const DiscountSchema = z.object({
  type: z.enum(["percentage", "fixed", "loyalty"]),
  value: z.number(),
  reason: z.string().optional(),
  requiresApproval: z.boolean().optional(),
});

// Payment Breakdown Schema
export const PaymentBreakdownSchema = z.object({
  method: z.enum(["cash", "card", "loyalty", "gift-card"]),
  amount: z.number(),
  reference: z.string().optional(),
});

// Tips Schema
export const TipsSchema = z.record(z.string(), z.number());

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  items: z.array(CartItemSchema),
  subtotal: z.number(),
  discount: DiscountSchema,
  discountAmount: z.number(),
  tax: z.number(),
  tips: TipsSchema,
  tipsTotal: z.number(),
  total: z.number(),
  payments: z.array(PaymentBreakdownSchema),
  paymentMethod: z.string().optional(), // Primary payment method for display
  loyaltyPointsEarned: z.number(),
  loyaltyPointsRedeemed: z.number(),
  status: z.enum(["pending", "completed", "cancelled", "refunded"]),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  createdBy: z.string(),
});

// Create Transaction Schema
export const CreateTransactionSchema = z.object({
  clientId: z.string().optional(),
  items: z.array(CartItemSchema),
  discount: DiscountSchema,
  payments: z.array(PaymentBreakdownSchema),
  tips: TipsSchema.optional(),
  loyaltyPointsRedeemed: z.number().optional(),
});

// Client Schema
export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  loyaltyPoints: z.number().default(0),
});

// Create Client Schema
export const CreateClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  loyaltyPoints: z.number().default(0),
});

// Appointment Schema
export const AppointmentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string().optional(),
  treatmentId: z.string(),
  treatmentName: z.string().optional(),
  datetimeISO: z.string().datetime(),
  status: z.enum(["confirmed", "pending", "cancelled", "completed"]).optional(),
  staffId: z.string().optional(),
  staffName: z.string().optional(),
  notes: z.string().optional(),
  duration: z.number().optional(),
  price: z.number().optional(),
});

// Create Appointment Schema
export const CreateAppointmentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  treatmentId: z.string().min(1, "Treatment is required"),
  datetimeISO: z.string().datetime(),
  status: z
    .enum(["confirmed", "pending", "cancelled", "completed"])
    .default("confirmed"),
  staffId: z.string().optional(),
  notes: z.string().optional(),
});

// Treatment Schema
export const TreatmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMinutes: z.number(),
  price: z.number().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Product Schema
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  stock: z.number(),
  category: z.string().optional(),
  sku: z.string().optional(),
  retail: z.boolean().optional(),
});

// Staff Schema
export const StaffSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  available: z.boolean().optional(),
});

// Draft Sale Schema
export const DraftSaleSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  clientId: z.string().optional(),
  clientData: z.any().optional(),
  cart: z.array(CartItemSchema),
  discount: DiscountSchema,
  tips: TipsSchema.optional(),
  currentStep: z.number(),
  expiresAt: z.string(),
});

// ============================================================================
// TYPES
// ============================================================================

export type CartItem = z.infer<typeof CartItemSchema>;
export type Discount = z.infer<typeof DiscountSchema>;
export type PaymentBreakdown = z.infer<typeof PaymentBreakdownSchema>;
export type Tips = z.infer<typeof TipsSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type Treatment = z.infer<typeof TreatmentSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Staff = z.infer<typeof StaffSchema>;
export type DraftSale = z.infer<typeof DraftSaleSchema>;

// Validation Types
export interface CartValidation {
  canAdd: boolean;
  reason?: string;
  warnings?: string[];
}

export interface StaffConflict {
  staffId: string;
  staffName: string;
  conflictingItems: string[];
  overlappingTime: boolean;
}

export interface DiscountValidation {
  valid: boolean;
  error?: string;
}

export interface PaymentValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
