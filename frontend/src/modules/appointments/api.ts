import { createResourceClient } from "../../services/resourceFactory";
import {
  AppointmentSchema,
  CreateAppointmentSchema,
  ClientSchema,
  TreatmentSchema,
  StaffSchema,
  type Appointment,
  type CreateAppointmentInput,
  type Client,
  type Treatment,
  type Staff,
} from "./AppointmentsSchema";

// Create typed API clients
export const appointmentsApi = createResourceClient<
  Appointment,
  CreateAppointmentInput
>({
  basePath: "/appointments",
  schema: AppointmentSchema,
  createSchema: CreateAppointmentSchema,
});

export const clientsApi = createResourceClient<Client, Partial<Client>>({
  basePath: "/clients",
  schema: ClientSchema,
});

export const treatmentsApi = createResourceClient<
  Treatment,
  Partial<Treatment>
>({
  basePath: "/treatments",
  schema: TreatmentSchema,
});

export const staffApi = createResourceClient<Staff, Partial<Staff>>({
  basePath: "/staff",
  schema: StaffSchema,
});

// Export individual functions for convenience
export const {
  list: listAppointments,
  get: getAppointment,
  create: createAppointment,
  update: updateAppointment,
  delete: deleteAppointment,
} = appointmentsApi;

export const { list: listClients, get: getClient } = clientsApi;

export const { list: listTreatments, get: getTreatment } = treatmentsApi;

export const { list: listStaff, get: getStaff } = staffApi;

// Export types
export type { Appointment, CreateAppointmentInput, Client, Treatment, Staff };
