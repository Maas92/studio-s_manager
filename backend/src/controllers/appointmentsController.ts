import { Response, NextFunction } from "express";
import { UserRequest } from "../middleware/userMiddleware.js";
import { appointmentService } from "../services/appointment.service.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { toCamelCase, toSnakeCase } from "../utils/fieldMapper.js";
/**
 * Helper function to transform appointment data for frontend
 */
function transformAppointmentForFrontend(appointment: any) {
  const transformed = toCamelCase(appointment);

  // Construct datetimeISO from booking_date and start_time
  if (appointment.booking_date && appointment.start_time) {
    const date = new Date(appointment.booking_date);
    const [hours, minutes] = appointment.start_time.split(":");
    date.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
    transformed.datetimeISO = date.toISOString();
  }

  return transformed;
}

/**
 * Get all appointments with filtering
 * GET /api/v1/appointments
 */
export const getAllAppointments = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const filters = {
      client_id: req.query.client_id as string,
      staff_id: req.query.staff_id as string,
      treatment_id: req.query.treatment_id as string,
      status: req.query.status as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };

    const result = await appointmentService.findAll(filters);

    res.status(200).json({
      status: "success",
      results: result.appointments.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: {
        appointments: result.appointments.map(transformAppointmentForFrontend),
      },
    });
  }
);

/**
 * Get single appointment
 * GET /api/v1/appointments/:id
 */
export const getAppointment = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const appointment = await appointmentService.findById(req.params.id);

    res.status(200).json({
      status: "success",
      data: {
        appointment: transformAppointmentForFrontend(appointment),
      },
    });
  }
);

/**
 * Create appointment
 * POST /api/v1/appointments
 */
export const createAppointment = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const data = toSnakeCase({
      ...req.body,
      createdBy: req.user?.id,
    });

    const appointment = await appointmentService.create(data);

    logger.info(
      `Appointment created by user ${req.user?.id}: ${appointment.id}`
    );

    res.status(201).json({
      status: "success",
      data: {
        appointment: transformAppointmentForFrontend(appointment),
      },
    });
  }
);

/**
 * Update appointment
 * PATCH /api/v1/appointments/:id
 */
export const updateAppointment = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const appointment = await appointmentService.update(
      req.params.id,
      req.body
    );

    logger.info(
      `Appointment updated by user ${req.user?.id}: ${req.params.id}`
    );

    res.status(200).json({
      status: "success",
      data: {
        appointment: transformAppointmentForFrontend(appointment),
      },
    });
  }
);

/**
 * Cancel appointment
 * POST /api/v1/appointments/:id/cancel
 */
export const cancelAppointment = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const { reason } = req.body;

    const appointment = await appointmentService.cancel(
      req.params.id,
      reason,
      req.user?.id
    );

    logger.info(
      `Appointment cancelled by user ${req.user?.id}: ${req.params.id}`
    );

    res.status(200).json({
      status: "success",
      data: {
        appointment: transformAppointmentForFrontend(appointment),
      },
    });
  }
);

/**
 * Check-in appointment
 * POST /api/v1/appointments/:id/check-in
 */
export const checkInAppointment = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const appointment = await appointmentService.checkIn(req.params.id);

    logger.info(
      `Appointment checked-in by user ${req.user?.id}: ${req.params.id}`
    );

    res.status(200).json({
      status: "success",
      data: {
        appointment: transformAppointmentForFrontend(appointment),
      },
    });
  }
);

/**
 * Complete appointment
 * POST /api/v1/appointments/:id/complete
 */
export const completeAppointment = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const { notes } = req.body;

    const appointment = await appointmentService.complete(req.params.id, notes);

    logger.info(
      `Appointment completed by user ${req.user?.id}: ${req.params.id}`
    );

    res.status(200).json({
      status: "success",
      data: {
        appointment: transformAppointmentForFrontend(appointment),
      },
    });
  }
);

/**
 * Get appointments by date range
 * GET /api/v1/appointments/calendar
 */
export const getCalendar = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const { start_date, end_date, staff_id } = req.query;

    if (!start_date || !end_date) {
      throw AppError.badRequest("start_date and end_date are required");
    }

    const appointments = await appointmentService.getCalendar(
      start_date as string,
      end_date as string,
      staff_id as string
    );

    res.status(200).json({
      status: "success",
      results: appointments.length,
      data: {
        appointments: appointments.map(transformAppointmentForFrontend),
      },
    });
  }
);

/**
 * Get appointment availability
 * GET /api/v1/appointments/availability
 */

export const getAvailability = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const { staff_id, date, duration_minutes } = req.query;

    if (!staff_id || !date || !duration_minutes) {
      throw AppError.badRequest(
        "staff_id, date, and duration_minutes are required"
      );
    }

    const availability = await appointmentService.getAvailability(
      staff_id as string,
      date as string,
      parseInt(duration_minutes as string)
    );

    res.status(200).json({
      status: "success",
      data: {
        availability,
      },
    });
  }
);
