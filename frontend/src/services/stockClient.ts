import { createResourceClient } from "../services/resourceFactory";
import api from "../services/api";
import { unwrapResponse, unwrapSingleResponse } from "../utils/unwrapResponse";
import {
  StockItemSchema,
  CreateStockItemSchema,
  TransferStockSchema,
  type StockItem,
  type CreateStockItemInput,
  type TransferStockInput,
} from "../modules/stock/StockSchema";

// Create the base resource client (WITHOUT transfer)
export const stockClient = createResourceClient<
  StockItem,
  CreateStockItemInput
>({
  basePath: "/stock",
  schema: StockItemSchema,
  createSchema: CreateStockItemSchema,
});

// Add the custom transfer method separately
export async function transferStock(data: TransferStockInput) {
  TransferStockSchema.parse(data); // Validate input
  const response = await api.post("/stock/transfer", data);
  const result = unwrapSingleResponse(response);
  if (!result) {
    throw new Error("Failed to transfer stock");
  }

  return result;
}

// Export types
export type { StockItem, CreateStockItemInput, TransferStockInput };
