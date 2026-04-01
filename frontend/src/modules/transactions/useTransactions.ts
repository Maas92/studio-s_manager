import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import { transactionClient } from "../../services/transactionClient";
import { type Transaction } from "./TransactionSchema";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters?: object) => [...transactionKeys.lists(), filters] as const,
  detail: (id: string) => [...transactionKeys.all, id] as const,
  stats: (filters?: object) =>
    [...transactionKeys.all, "stats", filters] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

export function useTransactions(filters?: {
  clientId?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const qc = useQueryClient();

  const listQuery = useQuery<Transaction[]>({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const res = await transactionClient.list(filters);
      const raw = (res as any).transactions ?? res ?? [];
      return raw.map(normaliseTransaction);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/transactions/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.lists() });
      toast.success("Transaction updated");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update transaction",
      );
    },
  });

  return {
    listQuery,
    updateStatusMutation,
  };
}

export function useTransaction(id?: string) {
  return useQuery<Transaction>({
    queryKey: transactionKeys.detail(id!),
    queryFn: async () => {
      const res = await transactionClient.get(id!);
      return res;
    },
    enabled: !!id,
  });
}

export function useTransactionStats(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: transactionKeys.stats(filters),
    queryFn: () =>
      api
        .get("/transactions/stats", { params: filters })
        .then((res) => res.data.data.stats),
  });
}
