import { useResource } from "../../hooks/useResource";
import { posClient } from "../../services/posClient";
import type { Transaction, CreateTransactionInput } from "./POSSchema";

export function usePos() {
  return useResource<Transaction, CreateTransactionInput>({
    resourceKey: "pos",
    client: posClient,
    toastMessages: {
      create: "Transaction completed",
      update: "Transaction updated",
      delete: "Transaction removed",
    },
  });
}
