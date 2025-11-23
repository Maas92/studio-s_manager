import { z } from "zod";

export const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(1, "Phone is required"),
  }),
});

export const searchClientSchema = z.object({
  query: z.object({
    q: z.string().optional(),
  }),
});
