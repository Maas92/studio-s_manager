import { createResourceClient } from "../../services/resourceFactory";
import {
  TreatmentSchema,
  CreateTreatmentSchema,
  type Treatment,
  type CreateTreatmentInput,
} from "./TreatmentSchema";

// Create typed API client
export const treatmentsApi = createResourceClient<
  Treatment,
  CreateTreatmentInput
>({
  basePath: "/treatments",
  schema: TreatmentSchema,
  createSchema: CreateTreatmentSchema,
});

// Export individual functions for convenience
export const {
  list: listTreatments,
  get: getTreatment,
  create: createTreatment,
  update: updateTreatment,
  delete: deleteTreatment,
} = treatmentsApi;

// Export types
export type { Treatment, CreateTreatmentInput };
