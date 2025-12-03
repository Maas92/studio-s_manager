import { z } from "zod";

/**
 * Schema for creating a new appointment
 */
export const createAppointmentSchema = z.object({
  body: z.object({
    client_id: z.string().uuid("Invalid client ID"),
    staff_id: z.string().uuid("Invalid staff ID"),
    treatment_id: z.string().uuid("Invalid treatment ID"),
    appointment_date: z.string().refine(
      (date) => {
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
      },
      { message: "Invalid date format. Use YYYY-MM-DD" }
    ),
    start_time: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format. Use HH:MM (24-hour format)"
      ),
    end_time: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format. Use HH:MM (24-hour format)"
      ),
    duration_minutes: z
      .number()
      .int("Duration must be an integer")
      .positive("Duration must be positive")
      .max(480, "Duration cannot exceed 8 hours"),
    notes: z
      .string()
      .max(1000, "Notes must be less than 1000 characters")
      .optional(),
  }),
});

/**
 * Schema for updating an appointment
 */
export const updateAppointmentSchema = z.object({
  body: z.object({
    client_id: z.string().uuid("Invalid client ID").optional(),
    staff_id: z.string().uuid("Invalid staff ID").optional(),
    treatment_id: z.string().uuid("Invalid treatment ID").optional(),
    appointment_date: z
      .string()
      .refine(
        (date) => {
          const dateObj = new Date(date);
          return !isNaN(dateObj.getTime());
        },
        { message: "Invalid date format" }
      )
      .optional(),
    start_time: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
      .optional(),
    end_time: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
      .optional(),
    duration_minutes: z.number().int().positive().max(480).optional(),
    notes: z.string().max(1000).optional(),
    status: z
      .enum([
        "scheduled",
        "confirmed",
        "checked_in",
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
 */
export const availabilityQuerySchema = z.object({
  query: z.object({
    staff_id: z.string().uuid("Invalid staff ID"),
    date: z.string().refine(
      (date) => {
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
      },
      { message: "Invalid date format" }
    ),
    duration_minutes: z.string().refine(
      (val) => {
        const num = parseInt(val);
        return !isNaN(num) && num > 0 && num <= 480;
      },
      { message: "Duration must be a positive number up to 480 minutes" }
    ),
  }),
});

/**
 * Schema for getting calendar view
 */
export const calendarQuerySchema = z.object({
  query: z.object({
    start_date: z.string().refine(
      (date) => {
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
      },
      { message: "Invalid start_date format" }
    ),
    end_date: z.string().refine(
      (date) => {
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
      },
      { message: "Invalid end_date format" }
    ),
    staff_id: z.string().uuid("Invalid staff ID").optional(),
  }),
});

/**
 * Schema for getting all appointments with filters
 */
export const getAllAppointmentsSchema = z.object({
  query: z.object({
    client_id: z.string().uuid("Invalid client ID").optional(),
    staff_id: z.string().uuid("Invalid staff ID").optional(),
    treatment_id: z.string().uuid("Invalid treatment ID").optional(),
    status: z
      .enum([
        "scheduled",
        "confirmed",
        "checked_in",
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
