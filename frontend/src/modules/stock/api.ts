import api from "../../services/api";
import { createResourceClient } from "../../services/resourceFactory";
import {
  StockItemSchema,
  CreateStockItemSchema,
  TransferStockSchema,
  type StockItem,
  type CreateStockItemInput,
  type TransferStockInput,
} from "./StockSchema";

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

// Custom transfer stock function (not part of standard CRUD)
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
    if (error instanceof Error) {
      throw error;
    }
    console.error("Failed to transfer stock:", error);
    throw new Error("Unable to transfer stock. Please try again.");
  }
}

// Export types
export type { StockItem, CreateStockItemInput, TransferStockInput };
