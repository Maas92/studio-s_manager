import { createResourceClient } from "./resourceFactory";
import {
  TreatmentSchema,
  CreateTreatmentSchema,
  type Treatment,
  type CreateTreatmentInput,
} from "../modules/treatments/TreatmentSchema";

export const treatmentsClient = createResourceClient<
  Treatment,
  CreateTreatmentInput
>({
  basePath: "/treatments",
  schema: TreatmentSchema,
  createSchema: CreateTreatmentSchema,
});
