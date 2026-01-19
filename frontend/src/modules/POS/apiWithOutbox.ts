// Enhanced POS API with outbox pattern support

import { useOutbox } from "../../hooks/useOutbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { CreateTransactionInput, Transaction } from "./POSSchema";
import type { CreateClientInput, Client } from "./POSSchema";

/**
 * Hook for creating transactions with offline support
 */
export function useCreateTransactionWithOutbox() {
  const { submitForm, isOnline } = useOutbox();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const result = await submitForm<Transaction>("/transactions", input, {
        method: "POST",
      });

      if (result.queued) {
        toast.success(
          "Transaction queued - will sync when connection is restored",
          { duration: 4000, icon: "📡" }
        );
      }

      return result.data as Transaction;
    },
    onSuccess: (_, variables) => {
      if (isOnline) {
        // Only invalidate if we're online and it was processed immediately
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success("Transaction completed successfully!");
      }
    },
    onError: (error: Error) => {
      console.error("Transaction error:", error);
      toast.error(`Transaction failed: ${error.message}`);
    },
  });
}

/**
 * Hook for creating clients with offline support
 */
export function useCreateClientWithOutbox() {
  const { submitForm, isOnline } = useOutbox();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const result = await submitForm<Client>("/clients", input, {
        method: "POST",
      });

      if (result.queued) {
        toast.success("Client creation queued - will sync when online", {
          duration: 4000,
          icon: "📡",
        });
      }

      return result.data as Client;
    },
    onSuccess: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success("Client created successfully!");
      }
    },
    onError: (error: Error) => {
      console.error("Create client error:", error);
      toast.error(`Failed to create client: ${error.message}`);
    },
  });
}

/**
 * Hook for updating appointments with offline support
 */
export function useCompleteAppointmentWithOutbox() {
  const { submitForm, isOnline } = useOutbox();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      const result = await submitForm(
        `/appointments/${appointmentId}`,
        {
          status: "completed",
          completedAt: new Date().toISOString(),
        },
        { method: "PATCH" }
      );

      if (result.queued) {
        toast.success("Appointment completion queued");
      }

      return result.data;
    },
    onSuccess: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
      }
    },
    onError: (error: Error) => {
      console.error("Complete appointment error:", error);
      toast.error("Failed to mark appointment as completed");
    },
  });
}

/**
 * Hook for updating stock with offline support
 */
export function useUpdateStockWithOutbox() {
  const { submitForm, isOnline } = useOutbox();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
      location,
      reason,
    }: {
      productId: string;
      quantity: number;
      location: string;
      reason: string;
    }) => {
      const result = await submitForm(
        `/products/${productId}/stock`,
        { quantity, location, reason },
        { method: "PATCH" }
      );

      if (result.queued) {
        toast.success("Stock update queued");
      }

      return result.data;
    },
    onSuccess: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ["stock"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    },
    onError: (error: Error) => {
      console.error("Stock update error:", error);
      toast.error("Stock update failed");
    },
  });
}

/**
 * Utility to check if we should show offline warnings
 */
export function useOfflineWarning() {
  const { isOnline, stats } = useOutbox();

  const shouldWarn = !isOnline || stats.pending > 0;
  const message = !isOnline
    ? "You are offline. Transactions will be queued."
    : `${stats.pending} transaction(s) pending sync`;

  return {
    shouldWarn,
    message,
    isOnline,
    pendingCount: stats.pending,
    failedCount: stats.failed,
  };
}
