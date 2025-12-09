import { createResourceClient } from "../services/resourceFactory";
import {
  AppointmentSchema,
  CreateAppointmentSchema,
  type Appointment,
  type CreateAppointmentInput,
} from "../modules/appointments/AppointmentsSchema";

export const appointmentsClient = createResourceClient<
  Appointment,
  CreateAppointmentInput
>({
  basePath: "/appointments",
  schema: AppointmentSchema,
  createSchema: CreateAppointmentSchema,
});
