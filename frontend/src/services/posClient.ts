import { createResourceClient } from "../services/resourceFactory";
import {
  TransactionSchema,
  CreateTransactionSchema,
  type Transaction,
  type CreateTransactionInput,
} from "../modules/POS/POSSchema";

export const posClient = createResourceClient<
  Transaction,
  CreateTransactionInput
>({
  basePath: "/pos",
  schema: TransactionSchema,
  createSchema: CreateTransactionSchema,
});
