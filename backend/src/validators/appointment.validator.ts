import { z } from "zod";

/**
 * Schema for creating a new appointment (INTENT-BASED)
 */
export const createAppointmentSchema = z.object({
  body: z.object({
    clientId: z.string().uuid("Invalid client ID"),
    treatmentId: z.string().uuid("Invalid service ID"),
    staffId: z.string().uuid("Invalid staff ID").optional().default(""),
    datetimeISO: z.string().datetime("Invalid appointment datetime"),
    notes: z
      .string()
      .max(1000, "Notes must be less than 1000 characters")
      .optional(),
  }),
});

/**
 * Schema for updating an appointment
 * (Derived fields still allowed because they already exist in DB)
 */
export const updateAppointmentSchema = z.object({
  body: z.object({
    clientId: z.string().uuid("Invalid client ID").optional(),
    staffId: z.string().uuid("Invalid staff ID").optional(),
    treatmentId: z.string().uuid("Invalid service ID").optional(),

    booking_date: z
      .string()
      .refine(
        (date) => !isNaN(new Date(date).getTime()),
        "Invalid booking date"
      )
      .optional(),

    start_time: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
      .optional(),

    end_time: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
      .optional(),

    notes: z.string().max(1000).optional(),

    status: z
      .enum([
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ])
      .optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid appointment ID"),
  }),
});

/**
 * Schema for cancelling an appointment
 */
export const cancelAppointmentSchema = z.object({
  body: z.object({
    reason: z
      .string()
      .max(500, "Reason must be less than 500 characters")
      .optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid appointment ID"),
  }),
});

/**
 * Schema for checking availability
 * (Duration still required here because this endpoint is predictive)
 */
export const availabilityQuerySchema = z.object({
  query: z.object({
    staffId: z.string().uuid("Invalid staff ID"),
    date: z
      .string()
      .refine(
        (date) => !isNaN(new Date(date).getTime()),
        "Invalid date format"
      ),
    duration_minutes: z.coerce
      .number()
      .int()
      .positive()
      .max(480, "Duration must be between 1 and 480 minutes"),
  }),
});

/**
 * Schema for getting calendar view
 */
export const calendarQuerySchema = z.object({
  query: z.object({
    start_date: z
      .string()
      .refine(
        (date) => !isNaN(new Date(date).getTime()),
        "Invalid start_date format"
      ),
    end_date: z
      .string()
      .refine(
        (date) => !isNaN(new Date(date).getTime()),
        "Invalid end_date format"
      ),
    staffId: z.string().uuid("Invalid staff ID").optional(),
  }),
});

/**
 * Schema for getting all appointments with filters
 */
export const getAllAppointmentsSchema = z.object({
  query: z.object({
    clientId: z.string().uuid("Invalid client ID").optional(),
    staffId: z.string().uuid("Invalid staff ID").optional(),
    treatmentId: z.string().uuid("Invalid service ID").optional(),

    status: z
      .enum([
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ])
      .optional(),

    date_from: z.string().optional(),
    date_to: z.string().optional(),

    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

/**
 * Schema for getting single appointment
 */
export const getAppointmentSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid appointment ID"),
  }),
});

/**
 * Schema for completing appointment
 */
export const completeAppointmentSchema = z.object({
  body: z.object({
    notes: z
      .string()
      .max(1000, "Completion notes must be less than 1000 characters")
      .optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid appointment ID"),
  }),
});
