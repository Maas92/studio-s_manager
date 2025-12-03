import api from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";
import {
  mockAppointments,
  mockClients,
  mockTreatments,
  mockStaff,
} from "./mockData";

// Schemas
export const AppointmentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string().optional(),
  treatmentId: z.string(),
  treatmentName: z.string().optional(),
  datetimeISO: z.string().datetime(),
  status: z.enum(["confirmed", "pending", "cancelled", "completed"]).optional(),
  staffId: z.string().optional(),
  staffName: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateAppointmentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  treatmentId: z.string().min(1, "Treatment is required"),
  datetimeISO: z.string().datetime(),
  status: z
    .enum(["confirmed", "pending", "cancelled", "completed"])
    .default("confirmed"),
  staffId: z.string().optional(),
  notes: z.string().optional(),
});

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const TreatmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMinutes: z.number(),
  price: z.number().optional(),
});

export const StaffSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
});

// Types
export type Appointment = z.infer<typeof AppointmentSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type Treatment = z.infer<typeof TreatmentSchema>;
export type Staff = z.infer<typeof StaffSchema>;

// API Functions
// export async function listAppointments(): Promise<Appointment[]> {
//   try {
//     const { data } = await api.get("/appointments");
//     const appointments = toArray<Appointment>(data);
//     return appointments.map((apt) => AppointmentSchema.parse(apt));
//   } catch (error) {
//     console.error("Failed to fetch appointments:", error);
//     throw new Error("Unable to load appointments. Please try again.");
//   }
// }

// export async function createAppointment(
//   input: CreateAppointmentInput
// ): Promise<Appointment> {
//   try {
//     const validatedInput = CreateAppointmentSchema.parse(input);
//     const { data } = await api.post("/appointments", validatedInput);
//     return AppointmentSchema.parse(data);
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       throw new Error(`Validation error: ${error.issues[0]?.message}`);
//     }
//     console.error("Failed to create appointment:", error);
//     throw new Error("Unable to create appointment. Please try again.");
//   }
// }

export async function updateAppointment(
  id: string,
  updates: Partial<CreateAppointmentInput>
): Promise<Appointment> {
  try {
    const { data } = await api.patch(`/appointments/${id}`, updates);
    return AppointmentSchema.parse(data);
  } catch (error) {
    console.error("Failed to update appointment:", error);
    throw new Error("Unable to update appointment. Please try again.");
  }
}

export async function deleteAppointment(id: string): Promise<void> {
  try {
    await api.delete(`/appointments/${id}`);
  } catch (error) {
    console.error("Failed to delete appointment:", error);
    throw new Error("Unable to delete appointment. Please try again.");
  }
}

// export async function listClients(): Promise<Client[]> {
//   try {
//     const { data } = await api.get("/clients");
//     const clients = toArray<Client>(data);
//     return clients.map((client) => ClientSchema.parse(client));
//   } catch (error) {
//     console.error("Failed to fetch clients:", error);
//     return [];
//   }
// }

// export async function listTreatments(): Promise<Treatment[]> {
//   try {
//     const { data } = await api.get("/treatments");
//     const treatments = toArray<Treatment>(data);
//     return treatments.map((treatment) => TreatmentSchema.parse(treatment));
//   } catch (error) {
//     console.error("Failed to fetch treatments:", error);
//     return [];
//   }
// }

// export async function listStaff(): Promise<Staff[]> {
//   try {
//     const { data } = await api.get("/staff");
//     const staff = toArray<Staff>(data);
//     return staff.map((member) => StaffSchema.parse(member));
//   } catch (error) {
//     console.error("Failed to fetch staff:", error);
//     return [];
//   }
// }

// Mock Data Functions for Development

const USE_MOCK_DATA = true; // Toggle this for development

export async function listAppointments(): Promise<Appointment[]> {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockAppointments;
  }

  try {
    const { data } = await api.get("/appointments");
    const appointments = toArray<Appointment>(data);
    return appointments.map((apt) => AppointmentSchema.parse(apt));
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    throw new Error("Unable to load appointments. Please try again.");
  }
}

export async function listClients(): Promise<Client[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockClients;
  }

  try {
    const { data } = await api.get("/clients");
    const clients = toArray<Client>(data);
    return clients.map((client) => ClientSchema.parse(client));
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return [];
  }
}

export async function listTreatments(): Promise<Treatment[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockTreatments;
  }

  try {
    const { data } = await api.get("/treatments");
    const treatments = toArray<Treatment>(data);
    return treatments.map((treatment) => TreatmentSchema.parse(treatment));
  } catch (error) {
    console.error("Failed to fetch treatments:", error);
    return [];
  }
}

export async function listStaff(): Promise<Staff[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockStaff;
  }

  try {
    const { data } = await api.get("/staff");
    const staff = toArray<Staff>(data);
    return staff.map((member) => StaffSchema.parse(member));
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return [];
  }
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<Appointment> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newApt: Appointment = {
      id: `apt${Date.now()}`,
      ...input,
      clientName: mockClients.find((c) => c.id === input.clientId)?.name,
      treatmentName: mockTreatments.find((t) => t.id === input.treatmentId)
        ?.name,
      staffName: input.staffId
        ? mockStaff.find((s) => s.id === input.staffId)?.name
        : undefined,
    };
    return newApt;
  }

  try {
    const validatedInput = CreateAppointmentSchema.parse(input);
    const { data } = await api.post("/appointments", validatedInput);
    return AppointmentSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create appointment:", error);
    throw new Error("Unable to create appointment. Please try again.");
  }
}
