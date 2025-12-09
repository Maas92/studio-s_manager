import { useResource } from "../../hooks/useResource";
import { appointmentsClient } from "../../services/appointmentsClient";
import type { Appointment, CreateAppointmentInput } from "./AppointmentsSchema";

export function useAppointments() {
  return useResource<Appointment, CreateAppointmentInput>({
    resourceKey: "appointments",
    client: appointmentsClient,
    toastMessages: {
      create: "Appointment created",
      update: "Appointment updated",
      delete: "Appointment cancelled",
    },
  });
}
