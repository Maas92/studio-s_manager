import { api } from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";

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

// ============================================================================
// API FUNCTIONS - APPOINTMENTS
// ============================================================================

/**
 * Get today's appointments for POS check-in
 */
export async function getTodaysAppointments(): Promise<Appointment[]> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await api.get(
      `/appointments?date=${today}&status=confirmed`
    );
    const appointments = toArray(data);
    return appointments.map((apt) => AppointmentSchema.parse(apt));
  } catch (error) {
    console.error("Failed to fetch today's appointments:", error);
    throw new Error("Unable to load appointments. Please try again.");
  }
}

/**
 * Create a new appointment (for booking next appointment after sale)
 */
export async function createAppointment(
  input: CreateAppointmentInput
): Promise<Appointment> {
  try {
    const validatedInput = CreateAppointmentSchema.parse(input);
    const { data } = await api.post("/appointments", validatedInput);
    return AppointmentSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create appointment:", error);
    throw new Error("Unable to create appointment. Please try again.");
  }
}

/**
 * Mark appointment as completed
 */
export async function completeAppointment(
  appointmentId: string
): Promise<void> {
  try {
    await api.patch(`/appointments/${appointmentId}`, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to mark appointment as completed:", error);
    throw new Error("Unable to complete appointment.");
  }
}

// ============================================================================
// API FUNCTIONS - PRODUCTS & INVENTORY
// ============================================================================

/**
 * Get retail products available for sale
 */
export async function getRetailProducts(): Promise<Product[]> {
  try {
    const { data } = await api.get("/products?retail=true");
    const products = toArray(data);
    return products.map((product) => ProductSchema.parse(product));
  } catch (error) {
    console.error("Failed to fetch retail products:", error);
    throw new Error("Unable to load products. Please try again.");
  }
}

/**
 * Check product stock availability
 */
export async function checkProductStock(productId: string): Promise<number> {
  try {
    const { data } = await api.get(`/products/${productId}/stock`);
    return data.available || 0;
  } catch (error) {
    console.error("Failed to check stock:", error);
    return 0;
  }
}

/**
 * Update stock after a sale
 */
export async function updateStockAfterSale(items: CartItem[]): Promise<void> {
  try {
    const productItems = items.filter((item) => item.type === "product");

    for (const item of productItems) {
      await api.patch(`/products/${item.productId}/stock`, {
        quantity: -item.quantity,
        location: "retail",
        reason: "sale",
      });
    }
  } catch (error) {
    console.error("Failed to update stock:", error);
    throw new Error("Stock update failed. Please check inventory manually.");
  }
}

// ============================================================================
// API FUNCTIONS - TREATMENTS
// ============================================================================

/**
 * Get available treatments
 */
export async function getAvailableTreatments(): Promise<Treatment[]> {
  try {
    const { data } = await api.get("/treatments?isActive=true");
    const treatments = toArray(data);
    return treatments.map((treatment) => TreatmentSchema.parse(treatment));
  } catch (error) {
    console.error("Failed to fetch treatments:", error);
    throw new Error("Unable to load treatments. Please try again.");
  }
}

// ============================================================================
// API FUNCTIONS - STAFF
// ============================================================================

/**
 * Get available staff members with optional date filtering
 */
export async function getAvailableStaff(date?: string): Promise<Staff[]> {
  try {
    const params = date ? `?date=${date}` : "";
    const { data } = await api.get(`/staff${params}`);
    const staff = toArray(data);
    return staff.map((member) => StaffSchema.parse(member));
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    throw new Error("Unable to load staff members. Please try again.");
  }
}

/**
 * Check for staff conflicts/availability
 */
export async function checkStaffConflicts(
  staffId: string,
  startTime: string,
  duration: number
): Promise<boolean> {
  try {
    const { data } = await api.get(
      `/staff/${staffId}/availability?start=${startTime}&duration=${duration}`
    );
    return data.available || false;
  } catch (error) {
    console.error("Failed to check staff availability:", error);
    return false;
  }
}

/**
 * Detect staff conflicts in cart
 */
export function detectStaffConflicts(cart: CartItem[]): StaffConflict[] {
  const conflicts: StaffConflict[] = [];
  const staffMap = new Map<string, CartItem[]>();

  // Group treatments by staff
  cart
    .filter(
      (item) =>
        (item.type === "treatment" || item.type === "appointment") &&
        item.staffId
    )
    .forEach((item) => {
      if (!staffMap.has(item.staffId!)) {
        staffMap.set(item.staffId!, []);
      }
      staffMap.get(item.staffId!)!.push(item);
    });

  // Check if same staff assigned multiple times
  staffMap.forEach((items, staffId) => {
    if (items.length > 1) {
      const staffName = items[0].staffName || "Unknown";
      conflicts.push({
        staffId,
        staffName,
        conflictingItems: items.map((i) => i.name),
        overlappingTime: true,
      });
    }
  });

  return conflicts;
}

// ============================================================================
// API FUNCTIONS - CLIENTS
// ============================================================================

/**
 * Verify client by phone or email
 */
export async function verifyClient(
  identifier: string,
  type: "phone" | "email"
): Promise<Client> {
  try {
    const { data } = await api.get(`/clients/verify?${type}=${identifier}`);
    return ClientSchema.parse(data);
  } catch (error) {
    console.error("Failed to verify client:", error);
    throw new Error("Unable to verify client. Please try again.");
  }
}

/**
 * Create a new client
 */
export async function createClient(input: CreateClientInput): Promise<Client> {
  try {
    const validatedInput = CreateClientSchema.parse(input);
    const { data } = await api.post("/clients", validatedInput);
    return ClientSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create client:", error);
    throw new Error("Unable to create client. Please try again.");
  }
}

/**
 * Get client by ID
 */
export async function getClientById(clientId: string): Promise<Client> {
  try {
    const { data } = await api.get(`/clients/${clientId}`);
    return ClientSchema.parse(data);
  } catch (error) {
    console.error("Failed to fetch client:", error);
    throw new Error("Unable to load client information.");
  }
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate loyalty points earned from a purchase
 * Rule: $1 = 10 points
 */
export function calculateLoyaltyPoints(total: number): number {
  return Math.floor(total * 10);
}

/**
 * Calculate monetary value of loyalty points
 * Rule: 100 points = $1
 */
export function calculateLoyaltyValue(points: number): number {
  return points / 100;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate discount application
 */
export function validateDiscount(
  discount: Discount,
  subtotal: number,
  maxDiscountPercent: number = 100
): DiscountValidation {
  if (discount.type === "percentage") {
    if (discount.value < 0 || discount.value > maxDiscountPercent) {
      return {
        valid: false,
        error: `Discount must be between 0% and ${maxDiscountPercent}%`,
      };
    }
  }

  if (discount.type === "fixed") {
    if (discount.value < 0) {
      return { valid: false, error: "Discount cannot be negative" };
    }
    if (discount.value > subtotal) {
      return {
        valid: false,
        error: "Discount cannot exceed subtotal",
      };
    }
  }

  // Large discounts (>50%) require reason
  const discountAmount =
    discount.type === "percentage"
      ? (subtotal * discount.value) / 100
      : discount.value;

  if (discountAmount > subtotal * 0.5 && !discount.reason) {
    return {
      valid: false,
      error: "Large discounts require a reason",
    };
  }

  return { valid: true };
}

/**
 * Validate payment amounts
 */
export function validatePayment(
  payments: PaymentBreakdown[],
  total: number,
  cashReceived?: number
): PaymentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid < total - 0.01) {
    errors.push(
      `Insufficient payment: $${(total - totalPaid).toFixed(2)} remaining`
    );
  }

  const cashPayment = payments.find((p) => p.method === "cash");
  if (cashPayment && (!cashReceived || cashReceived < cashPayment.amount)) {
    errors.push("Cash received must cover cash payment amount");
  }

  if (totalPaid > total + 0.01) {
    warnings.push(
      `Overpayment of $${(totalPaid - total).toFixed(2)} will be refunded`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate adding item to cart
 */
export function validateAddToCart(
  item: Omit<CartItem, "quantity">,
  currentCart: CartItem[],
  productStock: Record<string, number>
): CartValidation {
  // Only appointments cannot be duplicated
  if (item.type === "appointment") {
    const exists = currentCart.find(
      (i) => i.id === item.id && i.type === item.type
    );
    if (exists) {
      return {
        canAdd: false,
        reason: "This appointment is already in the cart",
      };
    }
  }

  // Check stock for products
  if (item.type === "product") {
    const stock = productStock[item.id] || 0;
    const inCart = currentCart
      .filter((i) => i.id === item.id && i.type === "product")
      .reduce((sum, i) => sum + i.quantity, 0);

    if (stock <= 0) {
      return {
        canAdd: false,
        reason: "Out of stock",
      };
    }

    if (stock <= inCart) {
      return {
        canAdd: false,
        reason: "Insufficient stock",
      };
    }

    const warnings = [];
    if (stock - inCart <= 5) {
      warnings.push(`Only ${stock - inCart} left in stock`);
    }

    return { canAdd: true, warnings };
  }

  // Treatments can be added multiple times
  return { canAdd: true };
}

// ============================================================================
// TRANSACTION FUNCTIONS
// ============================================================================

/**
 * Create a transaction (complete a sale)
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  try {
    const validatedInput = CreateTransactionSchema.parse(input);

    // Calculate totals
    const subtotal = validatedInput.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const discountAmount =
      validatedInput.discount.type === "percentage"
        ? (subtotal * validatedInput.discount.value) / 100
        : validatedInput.discount.value;

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const tax = afterDiscount * 0.15; // 15% tax

    const tipsTotal = Object.values(validatedInput.tips || {}).reduce(
      (sum, tip) => sum + tip,
      0
    );

    const total = afterDiscount + tax + tipsTotal;

    const loyaltyPointsEarned = calculateLoyaltyPoints(total);

    // Determine primary payment method for display
    const primaryPaymentMethod =
      validatedInput.payments.length === 1
        ? validatedInput.payments[0].method
        : "split";

    const transactionData = {
      ...validatedInput,
      subtotal,
      discountAmount,
      tax,
      tipsTotal,
      total,
      loyaltyPointsEarned,
      loyaltyPointsRedeemed: validatedInput.loyaltyPointsRedeemed || 0,
      paymentMethod: primaryPaymentMethod,
      status: "completed" as const,
      createdAt: new Date().toISOString(),
      createdBy: "current-user", // Replace with actual user ID
    };

    const { data } = await api.post("/transactions", transactionData);
    return TransactionSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create transaction:", error);
    throw new Error("Unable to complete transaction. Please try again.");
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  transactionId: string
): Promise<Transaction> {
  try {
    const { data } = await api.get(`/transactions/${transactionId}`);
    return TransactionSchema.parse(data);
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
    throw new Error("Unable to load transaction.");
  }
}

// ============================================================================
// RECEIPT FUNCTIONS
// ============================================================================

/**
 * Send receipt via email or SMS
 */
export async function sendReceipt(
  transactionId: string,
  method: "email" | "sms",
  recipient: string
): Promise<void> {
  try {
    await api.post(`/transactions/${transactionId}/receipt`, {
      method,
      recipient,
    });
  } catch (error) {
    console.error("Failed to send receipt:", error);
    throw new Error(`Unable to send receipt via ${method}. Please try again.`);
  }
}

/**
 * Print receipt (trigger browser print or send to printer)
 */
export async function printReceipt(transactionId: string): Promise<void> {
  try {
    const { data } = await api.get(`/transactions/${transactionId}/receipt`, {
      responseType: "blob",
    });

    // Create blob URL and trigger print
    const blob = new Blob([data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  } catch (error) {
    console.error("Failed to print receipt:", error);
    throw new Error("Unable to print receipt. Please try again.");
  }
}

// ============================================================================
// DRAFT MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Save draft sale to localStorage
 */
export function saveDraft(draft: DraftSale): void {
  try {
    const validatedDraft = DraftSaleSchema.parse(draft);
    localStorage.setItem("pos_draft", JSON.stringify(validatedDraft));
  } catch (error) {
    console.error("Failed to save draft:", error);
  }
}

/**
 * Load draft sale from localStorage
 */
export function loadDraft(): DraftSale | null {
  try {
    const draft = localStorage.getItem("pos_draft");
    if (!draft) return null;

    const parsed = JSON.parse(draft);

    // Check if draft has expired
    if (new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem("pos_draft");
      return null;
    }

    return DraftSaleSchema.parse(parsed);
  } catch (error) {
    console.error("Failed to load draft:", error);
    return null;
  }
}

/**
 * Clear draft sale from localStorage
 */
export function clearDraft(): void {
  try {
    localStorage.removeItem("pos_draft");
  } catch (error) {
    console.error("Failed to clear draft:", error);
  }
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  // Appointments
  getTodaysAppointments,
  createAppointment,
  completeAppointment,

  // Products
  getRetailProducts,
  checkProductStock,
  updateStockAfterSale,

  // Treatments
  getAvailableTreatments,

  // Staff
  getAvailableStaff,
  checkStaffConflicts,
  detectStaffConflicts,

  // Clients
  verifyClient,
  createClient,
  getClientById,

  // Calculations
  calculateLoyaltyPoints,
  calculateLoyaltyValue,

  // Validations
  validateDiscount,
  validatePayment,
  validateAddToCart,

  // Transactions
  createTransaction,
  getTransactionById,

  // Receipts
  sendReceipt,
  printReceipt,

  // Drafts
  saveDraft,
  loadDraft,
  clearDraft,
};
