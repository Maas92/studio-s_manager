import { z } from "zod";

// Schemas
export const AppointmentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string().optional(),
  treatmentId: z.string(),
  treatmentName: z.string().optional(),
  datetimeISO: z.string().datetime(),
  status: z.enum(["confirmed", "pending", "cancelled", "completed"]).optional(),
  staffId: z.string().nullable().optional(),
  staffName: z.string().optional(),
  notes: z.string().nullable().optional(),
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
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const TreatmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMinutes: z.number(),
  price: z.number().optional(),
});

export const StaffSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string().optional(),
});

// Types
export type Appointment = z.infer<typeof AppointmentSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type Treatment = z.infer<typeof TreatmentSchema>;
export type Staff = z.infer<typeof StaffSchema>;
