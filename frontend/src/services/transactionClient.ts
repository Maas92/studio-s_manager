import { createResourceClient } from "./resourceFactory";
import {
  TransactionSchema,
  type Transaction,
} from "../modules/transactions/TransactionSchema";

export const transactionClient = createResourceClient<Transaction, never>({
  basePath: "/transactions",
  schema: TransactionSchema,
});
