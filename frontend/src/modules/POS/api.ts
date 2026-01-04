import { createResourceClient } from "../../services/resourceFactory";
import api from "../../services/api";
import { z } from "zod";
import {
  AppointmentSchema,
  CreateAppointmentSchema,
  ProductSchema,
  TreatmentSchema,
  StaffSchema,
  CartItemSchema,
  ClientSchema,
  CreateClientSchema,
  CreateTransactionSchema,
  DraftSaleSchema,
  TransactionSchema,
  type StaffConflict,
  type Client,
  type Appointment,
  type CreateAppointmentInput,
  type CreateClientInput,
  type CreateTransactionInput,
  type CartItem,
  type CartValidation,
  type Discount,
  type DiscountValidation,
  type DraftSale,
  type PaymentBreakdown,
  type PaymentValidation,
  type Product,
  type Staff,
  type Transaction,
  type Treatment,
} from "./POSSchema";

// ============================================================================
// TAX CONFIGURATION
// ============================================================================

const TAX_CONFIG = {
  rate: 0.15, // 15% - change to 0.155 for 15.5%
  inclusive: true, // Tax is included in prices

  // Calculate tax from tax-inclusive price
  extractTax(amount: number): number {
    return amount * (this.rate / (1 + this.rate));
  },

  // Get the base amount (before tax) from tax-inclusive price
  getBaseAmount(amount: number): number {
    return amount / (1 + this.rate);
  },
};

// ============================================================================
// RESOURCE CLIENTS
// ============================================================================

export const appointmentsApi = createResourceClient<
  Appointment,
  CreateAppointmentInput
>({
  basePath: "/appointments",
  schema: AppointmentSchema,
  createSchema: CreateAppointmentSchema,
});

export const clientsApi = createResourceClient<Client, CreateClientInput>({
  basePath: "/clients",
  schema: ClientSchema,
  createSchema: CreateClientSchema,
});

export const productsApi = createResourceClient<Product, Partial<Product>>({
  basePath: "/products",
  schema: ProductSchema,
});

export const treatmentsApi = createResourceClient<
  Treatment,
  Partial<Treatment>
>({
  basePath: "/treatments",
  schema: TreatmentSchema,
});

export const staffApi = createResourceClient<Staff, Partial<Staff>>({
  basePath: "/staff",
  schema: StaffSchema,
});

export const transactionsApi = createResourceClient<
  Transaction,
  CreateTransactionInput
>({
  basePath: "/transactions",
  schema: TransactionSchema,
  createSchema: CreateTransactionSchema,
});

// ============================================================================
// APPOINTMENT FUNCTIONS
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
    const appointments = Array.isArray(data) ? data : [data];
    return appointments.map((apt) => AppointmentSchema.parse(apt));
  } catch (error) {
    console.error("Failed to fetch today's appointments:", error);
    throw new Error("Unable to load appointments. Please try again.");
  }
}

/**
 * Mark appointment as completed
 */
export async function completeAppointment(
  appointmentId: string
): Promise<void> {
  try {
    await appointmentsApi.update(appointmentId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    } as any);
  } catch (error) {
    console.error("Failed to mark appointment as completed:", error);
    throw new Error("Unable to complete appointment.");
  }
}

// ============================================================================
// PRODUCT & INVENTORY FUNCTIONS
// ============================================================================

/**
 * Get retail products available for sale
 */
export async function getRetailProducts(): Promise<Product[]> {
  try {
    const { data } = await api.get("/products?retail=true");
    const products = Array.isArray(data) ? data : [data];
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
// TREATMENT FUNCTIONS
// ============================================================================

/**
 * Get available treatments
 */
export async function getAvailableTreatments(): Promise<Treatment[]> {
  try {
    const { data } = await api.get("/treatments?isActive=true");
    const treatments = Array.isArray(data) ? data : [data];
    return treatments.map((treatment) => TreatmentSchema.parse(treatment));
  } catch (error) {
    console.error("Failed to fetch treatments:", error);
    throw new Error("Unable to load treatments. Please try again.");
  }
}

// ============================================================================
// STAFF FUNCTIONS
// ============================================================================

/**
 * Get available staff members with optional date filtering
 */
export async function getAvailableStaff(date?: string): Promise<Staff[]> {
  try {
    const params = date ? `?date=${date}` : "";
    const { data } = await api.get(`/staff${params}`);
    const staff = Array.isArray(data) ? data : [data];
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
// CLIENT FUNCTIONS
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

/**
 * Get current tax configuration
 */
export function getTaxConfig() {
  return {
    rate: TAX_CONFIG.rate,
    inclusive: TAX_CONFIG.inclusive,
    displayRate: `${(TAX_CONFIG.rate * 100).toFixed(1)}%`,
  };
}

/**
 * Calculate tax from an amount based on configuration
 */
export function calculateTax(amount: number): number {
  return TAX_CONFIG.extractTax(amount);
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

    // Calculate subtotal (already tax-inclusive from cart prices)
    const subtotal = validatedInput.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Calculate discount amount
    const discountAmount =
      validatedInput.discount.type === "percentage"
        ? (subtotal * validatedInput.discount.value) / 100
        : validatedInput.discount.value;

    // Calculate loyalty value
    const loyaltyValue = validatedInput.loyaltyPointsRedeemed
      ? validatedInput.loyaltyPointsRedeemed * 0.01
      : 0;

    // Total after discounts (still tax-inclusive)
    const afterDiscount = Math.max(0, subtotal - discountAmount - loyaltyValue);

    // Extract tax from the tax-inclusive amount
    const tax = TAX_CONFIG.extractTax(afterDiscount);

    // Calculate tips total
    const tipsTotal = Object.values(validatedInput.tips || {}).reduce(
      (sum, tip) => sum + tip,
      0
    );

    // Final total = tax-inclusive amount + tips
    const total = afterDiscount + tipsTotal;

    // Calculate loyalty points earned based on final total
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
      loyaltyValue, // Add this field
      tax,
      taxRate: TAX_CONFIG.rate, // Store tax rate used
      taxInclusive: TAX_CONFIG.inclusive, // Store tax method
      tipsTotal,
      total,
      loyaltyPointsEarned,
      loyaltyPointsRedeemed: validatedInput.loyaltyPointsRedeemed || 0,
      paymentMethod: primaryPaymentMethod,
      status: "completed" as const,
      createdAt: new Date().toISOString(),
      createdBy: "current-user", // Replace with actual user ID
    };

    return await transactionsApi.create(transactionData as any);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create transaction:", error);
    throw new Error("Unable to complete transaction. Please try again.");
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
// CONVENIENCE EXPORTS
// ============================================================================

// Re-export resource client methods for convenience
export const {
  list: listAppointments,
  get: getAppointment,
  create: createAppointment,
  update: updateAppointment,
  delete: deleteAppointment,
} = appointmentsApi;

export const {
  list: listClients,
  get: getClient,
  create: createClient,
  update: updateClient,
  delete: deleteClient,
} = clientsApi;

export const {
  list: listProducts,
  get: getProduct,
  create: createProduct,
  update: updateProduct,
  delete: deleteProduct,
} = productsApi;

export const {
  list: listTreatments,
  get: getTreatment,
  create: createTreatment,
  update: updateTreatment,
  delete: deleteTreatment,
} = treatmentsApi;

export const {
  list: listStaff,
  get: getStaff,
  create: createStaff,
  update: updateStaff,
  delete: deleteStaff,
} = staffApi;

export const {
  list: listTransactions,
  get: getTransaction,
  update: updateTransaction,
  delete: deleteTransaction,
} = transactionsApi;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Resource clients
  appointmentsApi,
  clientsApi,
  productsApi,
  treatmentsApi,
  staffApi,
  transactionsApi,

  // Appointments
  getTodaysAppointments,
  createAppointment,
  completeAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,

  // Products
  getRetailProducts,
  checkProductStock,
  updateStockAfterSale,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,

  // Treatments
  getAvailableTreatments,
  listTreatments,
  getTreatment,
  createTreatment,
  updateTreatment,
  deleteTreatment,

  // Staff
  getAvailableStaff,
  checkStaffConflicts,
  detectStaffConflicts,
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,

  // Clients
  verifyClient,
  createClient,
  listClients,
  getClient,
  updateClient,
  deleteClient,

  // Calculations
  calculateLoyaltyPoints,
  calculateLoyaltyValue,

  // Validations
  validateDiscount,
  validatePayment,
  validateAddToCart,

  // Transactions
  createTransaction,
  listTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,

  // Receipts
  sendReceipt,
  printReceipt,

  // Drafts
  saveDraft,
  loadDraft,
  clearDraft,
};
