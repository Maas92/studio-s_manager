import { createResourceClient } from "../services/resourceFactory";
import {
  StockItemSchema,
  CreateStockItemSchema,
  TransferStockSchema,
  type StockItem,
  type CreateStockItemInput,
  type TransferStockInput,
} from "../modules/stock/StockSchema";
import { tr } from "zod/v4/locales";

export const stockClient = createResourceClient<
  StockItem,
  CreateStockItemInput
>({
  basePath: "/stock",
  schema: StockItemSchema,
  createSchema: CreateStockItemSchema,
  transferSchema: TransferStockSchema,
});
