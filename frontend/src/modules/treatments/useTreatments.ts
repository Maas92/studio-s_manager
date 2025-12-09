import { useResource } from "../../hooks/useResource";
import { treatmentsClient } from "../../services/treatmentsClient";
import type { Treatment, CreateTreatmentInput } from "./TreatmentSchema";

export function useTreatments() {
  return useResource<Treatment, CreateTreatmentInput>({
    resourceKey: "treatments",
    client: treatmentsClient,
    toastMessages: {
      create: "Treatment created",
      update: "Treatment updated",
      delete: "Treatment deleted",
    },
  });
}
