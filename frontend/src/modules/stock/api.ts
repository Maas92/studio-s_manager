import api from "../../services/api";
import { createResourceClient } from "../../services/resourceFactory";
import {
  StockItemSchema,
  CreateStockItemSchema,
  TransferStockSchema,
  type StockLocation,
  type StockItem,
  type CreateStockItemInput,
  type TransferStockInput,
} from "./StockSchema";

// ============================================================================
// RESOURCE CLIENT
// ============================================================================

// Create typed API client
export const stockApi = createResourceClient<StockItem, CreateStockItemInput>({
  basePath: "/stock",
  schema: StockItemSchema,
  createSchema: CreateStockItemSchema,
});

// Export individual functions for convenience
export const {
  list: listStockItems,
  get: getStockItem,
  create: createStockItem,
  update: updateStockItem,
  delete: deleteStockItem,
} = stockApi;

// ============================================================================
// STOCK MOVEMENT FUNCTIONS
// ============================================================================

/**
 * Record a stock movement (adjustment, sale, return, etc.)
 * This is what the POS system should use when items are sold
 */
export async function recordStockMovement(movement: {
  stockId: string;
  quantity: number;
  type: "sale" | "adjustment" | "return" | "damage" | "transfer";
  reason?: string;
  fromLocation?: StockLocation;
  toLocation?: StockLocation;
  referenceId?: string; // e.g., transaction ID, transfer ID
}): Promise<StockItem> {
  try {
    const { data } = await api.post("/stock/movement", movement);
    return StockItemSchema.parse(data);
  } catch (error) {
    console.error("Failed to record stock movement:", error);
    throw new Error("Unable to record stock movement. Please try again.");
  }
}

/**
 * Get stock movement history for a specific item
 */
export async function getStockMovements(stockId: string): Promise<
  Array<{
    id: string;
    stockId: string;
    quantity: number;
    type: string;
    reason?: string;
    createdAt: string;
    createdBy: string;
  }>
> {
  try {
    const { data } = await api.get(`/stock/${stockId}/movements`);
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error("Failed to fetch stock movements:", error);
    throw new Error("Unable to load stock movements. Please try again.");
  }
}

// ============================================================================
// TRANSFER FUNCTIONS
// ============================================================================

/**
 * Transfer stock between locations
 */
export async function transferStock(
  input: TransferStockInput
): Promise<{ success: boolean; message: string }> {
  try {
    const validatedInput = TransferStockSchema.parse(input);

    // Validate transfer
    if (validatedInput.quantity <= 0) {
      throw new Error("Transfer quantity must be greater than zero");
    }

    const { data } = await api.post("/stock/transfer", validatedInput);
    return {
      success: true,
      message: data.message || "Stock transferred successfully",
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    console.error("Failed to transfer stock:", error);
    throw new Error("Unable to transfer stock. Please try again.");
  }
}

// ============================================================================
// STOCK ADJUSTMENT FUNCTIONS
// ============================================================================

/**
 * Adjust stock quantity for a specific item
 * Use this for corrections, damages, or other adjustments
 */
export async function adjustStock(
  stockId: string,
  adjustment: {
    quantity: number; // Positive to add, negative to subtract
    reason: string;
    location: StockLocation;
  }
): Promise<StockItem> {
  try {
    if (!adjustment.reason.trim()) {
      throw new Error("Reason is required for stock adjustments");
    }

    const { data } = await api.post(`/stock/${stockId}/adjust`, adjustment);
    return StockItemSchema.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    console.error("Failed to adjust stock:", error);
    throw new Error("Unable to adjust stock. Please try again.");
  }
}

// ============================================================================
// STOCK QUERY FUNCTIONS
// ============================================================================

/**
 * Get stock items by location
 */
export async function getStockByLocation(
  location: StockLocation
): Promise<StockItem[]> {
  try {
    const { data } = await api.get(`/stock?location=${location}`);
    const items = Array.isArray(data) ? data : [data];
    return items.map((item) => StockItemSchema.parse(item));
  } catch (error) {
    console.error("Failed to fetch stock by location:", error);
    throw new Error("Unable to load stock. Please try again.");
  }
}

/**
 * Get low stock items (quantity below reorder point)
 */
export async function getLowStockItems(): Promise<StockItem[]> {
  try {
    const { data } = await api.get("/stock?lowStock=true");
    const items = Array.isArray(data) ? data : [data];
    return items.map((item) => StockItemSchema.parse(item));
  } catch (error) {
    console.error("Failed to fetch low stock items:", error);
    throw new Error("Unable to load low stock items. Please try again.");
  }
}

/**
 * Get out of stock items
 */
export async function getOutOfStockItems(): Promise<StockItem[]> {
  try {
    const { data } = await api.get("/stock?outOfStock=true");
    const items = Array.isArray(data) ? data : [data];
    return items.map((item) => StockItemSchema.parse(item));
  } catch (error) {
    console.error("Failed to fetch out of stock items:", error);
    throw new Error("Unable to load out of stock items. Please try again.");
  }
}

/**
 * Search stock items
 */
export async function searchStock(query: string): Promise<StockItem[]> {
  try {
    const { data } = await api.get(
      `/stock/search?q=${encodeURIComponent(query)}`
    );
    const items = Array.isArray(data) ? data : [data];
    return items.map((item) => StockItemSchema.parse(item));
  } catch (error) {
    console.error("Failed to search stock:", error);
    throw new Error("Unable to search stock. Please try again.");
  }
}

// ============================================================================
// POS-SPECIFIC FUNCTIONS
// ============================================================================

/**
 * Deduct stock after a sale (for POS system)
 * This should be called after a successful transaction
 */
export async function deductStockForSale(
  items: Array<{
    stockId: string;
    productId: string;
    quantity: number;
  }>,
  transactionId: string
): Promise<{ success: boolean; updatedItems: StockItem[] }> {
  try {
    const { data } = await api.post("/stock/deduct", {
      items,
      transactionId,
      reason: "sale",
    });

    return {
      success: true,
      updatedItems: Array.isArray(data.items)
        ? data.items.map((item: any) => StockItemSchema.parse(item))
        : [],
    };
  } catch (error) {
    console.error("Failed to deduct stock:", error);
    throw new Error("Unable to deduct stock. Please try again.");
  }
}

/**
 * Check if sufficient stock is available for a sale
 */
export async function checkStockAvailability(
  items: Array<{
    productId: string;
    quantity: number;
    location?: StockLocation;
  }>
): Promise<{
  available: boolean;
  insufficientItems: Array<{
    productId: string;
    requested: number;
    available: number;
  }>;
}> {
  try {
    const { data } = await api.post("/stock/check-availability", {
      items,
    });

    return {
      available: data.available || false,
      insufficientItems: data.insufficientItems || [],
    };
  } catch (error) {
    console.error("Failed to check stock availability:", error);
    // Return conservative response on error
    return {
      available: false,
      insufficientItems: items.map((item) => ({
        productId: item.productId,
        requested: item.quantity,
        available: 0,
      })),
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate total stock value
 */
export function calculateStockValue(items: StockItem[]): number {
  return items.reduce((total, item) => {
    const cost = item.cost || 0;
    const quantity = item.quantity || 0;
    return total + cost * quantity;
  }, 0);
}

/**
 * Group stock items by location
 */
export function groupStockByLocation(
  items: StockItem[]
): Record<StockLocation, StockItem[]> {
  return items.reduce((acc, item) => {
    const location = item.location || "warehouse";
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(item);
    return acc;
  }, {} as Record<StockLocation, StockItem[]>);
}

/**
 * Check if item needs reordering
 */
export function needsReorder(item: StockItem): boolean {
  const reorderPoint = 0; //item.reorderPoint || 0;
  const quantity = item.quantity || 0;
  return quantity <= reorderPoint;
}

/**
 * Get stock status
 */
export function getStockStatus(
  item: StockItem
): "in-stock" | "low-stock" | "out-of-stock" {
  const quantity = item.quantity || 0;
  const reorderPoint = 0; //item.reorderPoint || 0;

  if (quantity <= 0) return "out-of-stock";
  if (quantity <= reorderPoint) return "low-stock";
  return "in-stock";
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  StockItem,
  CreateStockItemInput,
  TransferStockInput,
  StockLocation,
};

export default {
  // Resource client methods
  list: listStockItems,
  get: getStockItem,
  create: createStockItem,
  update: updateStockItem,
  delete: deleteStockItem,

  // Movement functions
  recordStockMovement,
  getStockMovements,

  // Transfer functions
  transferStock,

  // Adjustment functions
  adjustStock,

  // Query functions
  getStockByLocation,
  getLowStockItems,
  getOutOfStockItems,
  searchStock,

  // POS functions
  deductStockForSale,
  checkStockAvailability,

  // Utility functions
  calculateStockValue,
  groupStockByLocation,
  needsReorder,
  getStockStatus,
};
