import express from "express";
import * as appointmentController from "../controllers/appointmentsController";
import { restrictTo } from "../middleware/userMiddleware";
import { validate, validateUUID } from "../middleware/validation";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
  availabilityQuerySchema,
  calendarQuerySchema,
  completeAppointmentSchema,
} from "../validators/appointment.validator";

const router = express.Router();

// ============================================
// PUBLIC ROUTES (AVAILABILITY & CALENDAR)
// ============================================

// Get availability for booking
router.get(
  "/availability",
  validate(availabilityQuerySchema),
  appointmentController.getAvailability
);

// Get calendar view
router.get(
  "/calendar",
  validate(calendarQuerySchema),
  appointmentController.getCalendar
);

// ============================================
// CRUD OPERATIONS
// ============================================

router
  .route("/")
  .get(appointmentController.getAllAppointments)
  .post(
    restrictTo("owner", "manager", "receptionist"),
    validate(createAppointmentSchema),
    appointmentController.createAppointment
  );

router
  .route("/:id")
  .get(validateUUID("id"), appointmentController.getAppointment)
  .patch(
    validateUUID("id"),
    restrictTo("owner", "manager", "receptionist"),
    validate(updateAppointmentSchema),
    appointmentController.updateAppointment
  );

// ============================================
// APPOINTMENT ACTIONS
// ============================================

// Cancel appointment
router.post(
  "/:id/cancel",
  validateUUID("id"),
  restrictTo("owner", "manager", "receptionist"),
  validate(cancelAppointmentSchema),
  appointmentController.cancelAppointment
);

// Check-in appointment
router.post(
  "/:id/check-in",
  validateUUID("id"),
  restrictTo("owner", "manager", "receptionist", "therapist"),
  appointmentController.checkInAppointment
);

// Complete appointment
router.post(
  "/:id/complete",
  validateUUID("id"),
  restrictTo("owner", "manager", "therapist"),
  validate(completeAppointmentSchema),
  appointmentController.completeAppointment
);

export default router;
