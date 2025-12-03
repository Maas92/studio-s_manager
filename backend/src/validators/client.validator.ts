import { z } from "zod";

/**
 * Schema for creating a new client
 */
export const createClientSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(200, "Name must be less than 200 characters")
      .trim(),
    email: z
      .string()
      .email("Invalid email address")
      .max(255, "Email must be less than 255 characters")
      .toLowerCase()
      .trim()
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .max(50, "Phone number must be less than 50 characters")
      .trim()
      .regex(/^[\d\s\+\-\(\)]+$/, "Phone number contains invalid characters"),
    whatsapp: z
      .string()
      .max(50, "WhatsApp number must be less than 50 characters")
      .trim()
      .optional(),
    notes: z
      .string()
      .max(1000, "Notes must be less than 1000 characters")
      .optional(),
    date_of_birth: z
      .string()
      .refine(
        (date) => {
          if (!date) return true; // Allow empty/undefined
          const parsed = new Date(date);
          return !isNaN(parsed.getTime());
        },
        { message: "Invalid date format" }
      )
      .optional(),
    address: z
      .string()
      .max(500, "Address must be less than 500 characters")
      .optional(),
  }),
});

/**
 * Schema for updating a client
 */
export const updateClientSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(200, "Name must be less than 200 characters")
      .trim()
      .optional(),
    email: z
      .string()
      .email("Invalid email address")
      .max(255, "Email must be less than 255 characters")
      .toLowerCase()
      .trim()
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .min(1, "Phone number cannot be empty")
      .max(50, "Phone number must be less than 50 characters")
      .trim()
      .regex(/^[\d\s\+\-\(\)]+$/, "Phone number contains invalid characters")
      .optional(),
    whatsapp: z
      .string()
      .max(50, "WhatsApp number must be less than 50 characters")
      .trim()
      .optional(),
    notes: z
      .string()
      .max(1000, "Notes must be less than 1000 characters")
      .optional(),
    date_of_birth: z
      .string()
      .refine(
        (date) => {
          if (!date) return true;
          const parsed = new Date(date);
          return !isNaN(parsed.getTime());
        },
        { message: "Invalid date format" }
      )
      .optional(),
    address: z
      .string()
      .max(500, "Address must be less than 500 characters")
      .optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid client ID"),
  }),
});

/**
 * Schema for searching clients
 */
export const searchClientSchema = z.object({
  query: z.object({
    q: z
      .string()
      .max(100, "Search term must be less than 100 characters")
      .optional(),
  }),
});

/**
 * Schema for getting client by ID
 */
export const getClientSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid client ID"),
  }),
});

/**
 * Schema for getting all clients with pagination
 */
export const getAllClientsSchema = z.object({
  query: z.object({
    q: z
      .string()
      .max(100, "Search term must be less than 100 characters")
      .optional(),
    page: z.coerce
      .number()
      .int("Page must be an integer")
      .positive("Page must be positive")
      .optional(),
    limit: z.coerce
      .number()
      .int("Limit must be an integer")
      .positive("Limit must be positive")
      .max(100, "Limit cannot exceed 100")
      .optional(),
  }),
});
