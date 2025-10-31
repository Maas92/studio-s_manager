import { api } from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";

export const TreatmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMinutes: z.number().optional().default(60),
  price: z.number().optional().default(0),
});
export type Treatment = z.infer<typeof TreatmentSchema>;

export async function listTreatments() {
  const { data } = await api.get("/treatments");
  return toArray<Treatment>(data);
}

export async function createTreatment(payload: Omit<Treatment, "id">) {
  const { data } = await api.post("/treatments", payload);
  return data as Treatment;
}
