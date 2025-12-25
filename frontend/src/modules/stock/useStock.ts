import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useResource } from "../../hooks/useResource";
import { stockClient, transferStock } from "../../services/stockClient";
import type {
  StockItem,
  CreateStockItemInput,
  TransferStockInput,
} from "./StockSchema";

export function useStock() {
  const queryClient = useQueryClient();

  // Get standard CRUD operations
  const baseResource = useResource<StockItem, CreateStockItemInput>({
    resourceKey: "stock",
    client: stockClient,
    toastMessages: {
      create: "Stock item created",
      update: "Stock item updated",
      delete: "Stock item removed",
    },
  });

  // Add custom transfer mutation (stock-specific)
  const transferMutation = useMutation({
    mutationFn: (data: TransferStockInput) => transferStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast.success("Stock transferred successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Failed to transfer stock");
    },
  });

  return {
    ...baseResource,
    transferMutation,
  };
}
