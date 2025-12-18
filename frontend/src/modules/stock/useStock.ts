import { useResource } from "../../hooks/useResource";
import { stockClient } from "../../services/stockClient";
import type { StockItem, CreateStockItemInput } from "./StockSchema";

export function useStock() {
  return useResource<StockItem, CreateStockItemInput>({
    resourceKey: "stock",
    client: stockClient,
    toastMessages: {
      create: "Stock item created",
      update: "Stock item updated",
      delete: "Stock item removed",
      transfer: "Stock item transferred",
    },
  });
}
