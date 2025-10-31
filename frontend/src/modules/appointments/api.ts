import { api } from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";

export const AppointmentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string().optional(),
  treatmentId: z.string(),
  treatmentName: z.string().optional(),
  datetimeISO: z.string(),
  status: z.string().optional(),
});
export type Appointment = z.infer<typeof AppointmentSchema>;

export async function listAppointments() {
  const { data } = await api.get("/appointments");
  return toArray<Appointment>(data);
}
