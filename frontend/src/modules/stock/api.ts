import api from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";
import { mockStockItems } from "./mockStock";

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
  cost: z.number().optional(),
  retailPrice: z.number().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
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
  cost: z.number().optional(),
  retailPrice: z.number().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export const TransferStockSchema = z.object({
  itemId: z.string(),
  fromLocation: StockLocationSchema,
  toLocation: StockLocationSchema,
  quantity: z.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

// Types
export type StockLocation = z.infer<typeof StockLocationSchema>;
export type StockItem = z.infer<typeof StockItemSchema>;
export type CreateStockItemInput = z.infer<typeof CreateStockItemSchema>;
export type TransferStockInput = z.infer<typeof TransferStockSchema>;

const USE_MOCK_DATA = true;

// API Functions
export async function listStockItems(): Promise<StockItem[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockStockItems;
  }

  try {
    const { data } = await api.get("/stock");
    const items = toArray<StockItem>(data);
    return items.map((item) => StockItemSchema.parse(item));
  } catch (error) {
    console.error("Failed to fetch stock items:", error);
    throw new Error("Unable to load stock items. Please try again.");
  }
}

export async function getStockItem(id: string): Promise<StockItem> {
  try {
    const { data } = await api.get(`/stock/${id}`);
    return StockItemSchema.parse(data);
  } catch (error) {
    console.error("Failed to fetch stock item:", error);
    throw new Error("Unable to load stock item details. Please try again.");
  }
}

export async function createStockItem(
  input: CreateStockItemInput
): Promise<StockItem> {
  try {
    const validatedInput = CreateStockItemSchema.parse(input);
    const { data } = await api.post("/stock", validatedInput);
    return StockItemSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create stock item:", error);
    throw new Error("Unable to create stock item. Please try again.");
  }
}

export async function updateStockItem(
  id: string,
  updates: Partial<CreateStockItemInput>
): Promise<StockItem> {
  try {
    const { data } = await api.patch(`/stock/${id}`, updates);
    return StockItemSchema.parse(data);
  } catch (error) {
    console.error("Failed to update stock item:", error);
    throw new Error("Unable to update stock item. Please try again.");
  }
}

export async function deleteStockItem(id: string): Promise<void> {
  try {
    await api.delete(`/stock/${id}`);
  } catch (error) {
    console.error("Failed to delete stock item:", error);
    throw new Error("Unable to delete stock item. Please try again.");
  }
}

export async function transferStock(
  input: TransferStockInput
): Promise<{ success: boolean; message: string }> {
  try {
    const validatedInput = TransferStockSchema.parse(input);

    // Validate transfer
    if (validatedInput.fromLocation === validatedInput.toLocation) {
      throw new Error("Cannot transfer to the same location");
    }

    const { data } = await api.post("/stock/transfer", validatedInput);
    return {
      success: true,
      message: data.message || "Stock transferred successfully",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    if (error instanceof Error) {
      throw error;
    }
    console.error("Failed to transfer stock:", error);
    throw new Error("Unable to transfer stock. Please try again.");
  }
}
