import { createResourceClient } from "../services/resourceFactory";
import {
  StockItemSchema,
  CreateStockItemSchema,
  type StockItem,
  type CreateStockItemInput,
} from "../modules/stock/StockSchema";

export const stockClient = createResourceClient<
  StockItem,
  CreateStockItemInput
>({
  basePath: "/stock",
  schema: StockItemSchema,
  createSchema: CreateStockItemSchema,
});
