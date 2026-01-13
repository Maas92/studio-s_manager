import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cashUpClient } from "../../services/cashUpClient";
import toast from "react-hot-toast";

export function useCashUp() {
  const qc = useQueryClient();

  // List query
  const listQuery = (filters?: any) =>
    useQuery({
      queryKey: ["cash-ups", filters],
      queryFn: () =>
        cashUpClient.getAll(filters).then((res) => res.data.data.cashUps),
    });

  // Get by ID query
  const getQuery = (id: string) =>
    useQuery({
      queryKey: ["cash-ups", id],
      queryFn: () =>
        cashUpClient.getById(id).then((res) => res.data.data.cashUp),
      enabled: !!id,
    });

  // Daily snapshot query
  const dailySnapshotQuery = useQuery({
    queryKey: ["cash-ups", "daily-snapshot"],
    queryFn: () =>
      cashUpClient.getDailySnapshot().then((res) => res.data.data.snapshot),
    refetchInterval: 60000, // Refresh every minute
  });

  // Summary query
  const summaryQuery = (startDate?: string, endDate?: string) =>
    useQuery({
      queryKey: ["cash-ups", "summary", startDate, endDate],
      queryFn: () =>
        cashUpClient
          .getSummary(startDate, endDate)
          .then((res) => res.data.data.summary),
    });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: cashUpClient.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Cash-up session created");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create cash-up");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      cashUpClient.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Cash-up updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update cash-up");
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      cashUpClient.complete(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Cash-up completed successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to complete cash-up"
      );
    },
  });

  // Reconcile mutation
  const reconcileMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      cashUpClient.reconcile(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Cash-up reconciled");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reconcile");
    },
  });

  // Expense mutations
  const addExpenseMutation = useMutation({
    mutationFn: ({ cashUpId, data }: { cashUpId: string; data: any }) =>
      cashUpClient.addExpense(cashUpId, data),
    onSuccess: (response, variables) => {
      // Invalidate all cash-up queries to refetch
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      // Also refetch the specific session
      qc.invalidateQueries({ queryKey: ["cash-ups", variables.cashUpId] });
      qc.invalidateQueries({ queryKey: ["cash-ups", "daily-snapshot"] });
      toast.success("Expense added");
    },
    onError: (error: any) => {
      console.error("Add expense error:", error);
      toast.error(error.response?.data?.message || "Failed to add expense");
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({
      cashUpId,
      expenseId,
      data,
    }: {
      cashUpId: string;
      expenseId: string;
      data: any;
    }) => cashUpClient.updateExpense(cashUpId, expenseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Expense updated");
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: ({
      cashUpId,
      expenseId,
    }: {
      cashUpId: string;
      expenseId: string;
    }) => cashUpClient.deleteExpense(cashUpId, expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Expense deleted");
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: ({
      cashUpId,
      expenseId,
      file,
    }: {
      cashUpId: string;
      expenseId: string;
      file: File;
    }) => cashUpClient.uploadReceipt(cashUpId, expenseId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Receipt uploaded");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to upload receipt");
    },
  });

  // Safe drop mutations
  const addSafeDropMutation = useMutation({
    mutationFn: ({ cashUpId, data }: { cashUpId: string; data: any }) =>
      cashUpClient.addSafeDrop(cashUpId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Safe drop recorded");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add safe drop");
    },
  });

  const updateSafeDropMutation = useMutation({
    mutationFn: ({
      cashUpId,
      dropId,
      data,
    }: {
      cashUpId: string;
      dropId: string;
      data: any;
    }) => cashUpClient.updateSafeDrop(cashUpId, dropId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Safe drop updated");
    },
  });

  const deleteSafeDropMutation = useMutation({
    mutationFn: ({ cashUpId, dropId }: { cashUpId: string; dropId: string }) =>
      cashUpClient.deleteSafeDrop(cashUpId, dropId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-ups"] });
      toast.success("Safe drop deleted");
    },
  });

  return {
    listQuery,
    getQuery,
    dailySnapshotQuery,
    summaryQuery,
    createMutation,
    updateMutation,
    completeMutation,
    reconcileMutation,
    addExpenseMutation,
    updateExpenseMutation,
    deleteExpenseMutation,
    uploadReceiptMutation,
    addSafeDropMutation,
    updateSafeDropMutation,
    deleteSafeDropMutation,
  };
}
