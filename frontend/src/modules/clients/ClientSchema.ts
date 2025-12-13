import { z } from "zod";

// Schemas
export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  loyaltyPoints: z.number().nullable().optional(),
});

export const CreateClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Types
export type Client = z.infer<typeof ClientSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
