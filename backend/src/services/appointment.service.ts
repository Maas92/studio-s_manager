import { pool } from "../config/database";
import AppError from "../utils/appError";
import { logger } from "../utils/logger";

interface AppointmentFilters {
  client_id?: string;
  staff_id?: string;
  treatment_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

interface CreateAppointmentData {
  client_id: string;
  staff_id: string;
  treatment_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  notes?: string;
  created_by?: string;
}

export class AppointmentService {
  /**
   * Find all appointments with filters
   */
  async findAll(filters: AppointmentFilters) {
    const {
      client_id,
      staff_id,
      treatment_id,
      status,
      date_from,
      date_to,
      page = 1,
      limit = 50,
    } = filters;

    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (client_id) {
      conditions.push(`a.client_id = $${paramIndex++}`);
      params.push(client_id);
    }

    if (staff_id) {
      conditions.push(`a.staff_id = $${paramIndex++}`);
      params.push(staff_id);
    }

    if (treatment_id) {
      conditions.push(`a.treatment_id = $${paramIndex++}`);
      params.push(treatment_id);
    }

    if (status) {
      conditions.push(`a.status = $${paramIndex++}`);
      params.push(status);
    }

    if (date_from) {
      conditions.push(`a.appointment_date >= $${paramIndex++}`);
      params.push(date_from);
    }

    if (date_to) {
      conditions.push(`a.appointment_date <= $${paramIndex++}`);
      params.push(date_to);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const query = `
      SELECT 
        a.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        t.name as treatment_name,
        t.duration_minutes as treatment_duration,
        t.price as treatment_price
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      ${whereClause}
      ORDER BY a.appointment_date DESC, a.start_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM appointments a
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    return {
      appointments: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Find appointment by ID
   */
  async findById(id: string) {
    const result = await pool.query(
      `
      SELECT 
        a.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        t.name as treatment_name,
        t.description as treatment_description,
        t.duration_minutes as treatment_duration,
        t.price as treatment_price
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      WHERE a.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Appointment not found");
    }

    return result.rows[0];
  }

  /**
   * Create new appointment
   */
  async create(data: CreateAppointmentData) {
    // Check for conflicts
    const conflictCheck = await pool.query(
      `
      SELECT id FROM appointments
      WHERE staff_id = $1
        AND appointment_date = $2
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time <= $3 AND end_time > $3)
          OR (start_time < $4 AND end_time >= $4)
          OR (start_time >= $3 AND end_time <= $4)
        )
    `,
      [data.staff_id, data.appointment_date, data.start_time, data.end_time]
    );

    if (conflictCheck.rows.length > 0) {
      throw AppError.conflict(
        "This time slot is already booked for the selected staff member"
      );
    }

    const result = await pool.query(
      `
      INSERT INTO appointments (
        client_id, staff_id, treatment_id, 
        appointment_date, start_time, end_time, 
        duration_minutes, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        data.client_id,
        data.staff_id,
        data.treatment_id,
        data.appointment_date,
        data.start_time,
        data.end_time,
        data.duration_minutes,
        "scheduled",
        data.notes || null,
        data.created_by || null,
      ]
    );

    logger.info(`Appointment created: ${result.rows[0].id}`);
    return result.rows[0];
  }

  /**
   * Update appointment
   */
  async update(id: string, data: Partial<CreateAppointmentData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      "client_id",
      "staff_id",
      "treatment_id",
      "appointment_date",
      "start_time",
      "end_time",
      "duration_minutes",
      "notes",
      "status",
    ];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No valid fields to update");
    }

    values.push(id);

    const result = await pool.query(
      `
      UPDATE appointments
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Appointment not found");
    }

    logger.info(`Appointment updated: ${id}`);
    return result.rows[0];
  }

  /**
   * Cancel appointment
   */
  async cancel(id: string, reason?: string, cancelled_by?: string) {
    const result = await pool.query(
      `
      UPDATE appointments
      SET status = 'cancelled',
          cancellation_reason = $1,
          cancelled_by = $2,
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `,
      [reason || null, cancelled_by || null, id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Appointment not found");
    }

    logger.info(`Appointment cancelled: ${id}`);
    return result.rows[0];
  }

  /**
   * Check-in appointment
   */
  async checkIn(id: string) {
    const result = await pool.query(
      `
      UPDATE appointments
      SET status = 'checked_in',
          checked_in_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'scheduled'
      RETURNING *
    `,
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.badRequest(
        "Appointment not found or cannot be checked in"
      );
    }

    logger.info(`Appointment checked in: ${id}`);
    return result.rows[0];
  }

  /**
   * Complete appointment
   */
  async complete(id: string, notes?: string) {
    const result = await pool.query(
      `
      UPDATE appointments
      SET status = 'completed',
          completion_notes = $1,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status IN ('scheduled', 'checked_in')
      RETURNING *
    `,
      [notes || null, id]
    );

    if (result.rows.length === 0) {
      throw AppError.badRequest("Appointment not found or cannot be completed");
    }

    logger.info(`Appointment completed: ${id}`);
    return result.rows[0];
  }

  /**
   * Get availability slots for a staff member
   */
  async getAvailability(
    staff_id: string,
    date: string,
    duration_minutes: number
  ) {
    // Get staff working hours (simplified - you may want to store this in DB)
    const workingHours = {
      start: "09:00",
      end: "18:00",
    };

    // Get existing appointments
    const existingAppointments = await pool.query(
      `
      SELECT start_time, end_time
      FROM appointments
      WHERE staff_id = $1
        AND appointment_date = $2
        AND status NOT IN ('cancelled', 'no_show')
      ORDER BY start_time
    `,
      [staff_id, date]
    );

    // Generate available slots
    const availableSlots: string[] = [];
    const slotInterval = 30; // 30-minute intervals

    // Calculate number of slots in working hours
    const startMinutes = this.timeToMinutes(workingHours.start);
    const endMinutes = this.timeToMinutes(workingHours.end);

    for (
      let time = startMinutes;
      time <= endMinutes - duration_minutes;
      time += slotInterval
    ) {
      const slotTime = this.minutesToTime(time);
      const slotEndTime = this.minutesToTime(time + duration_minutes);

      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.rows.some((apt) => {
        const aptStart = this.timeToMinutes(apt.start_time);
        const aptEnd = this.timeToMinutes(apt.end_time);
        const slotStart = time;
        const slotEnd = time + duration_minutes;

        return (
          (slotStart >= aptStart && slotStart < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (slotStart <= aptStart && slotEnd >= aptEnd)
        );
      });

      if (!hasConflict && time + duration_minutes <= endMinutes) {
        availableSlots.push(slotTime);
      }
    }

    return availableSlots;
  }

  /**
   * Get calendar view of appointments
   */
  async getCalendar(start_date: string, end_date: string, staff_id?: string) {
    const params: any[] = [start_date, end_date];
    let paramIndex = 3;
    let staffCondition = "";

    if (staff_id) {
      staffCondition = `AND a.staff_id = $${paramIndex}`;
      params.push(staff_id);
    }

    const result = await pool.query(
      `
      SELECT 
        a.id,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.status,
        c.first_name || ' ' || c.last_name as client_name,
        t.name as treatment_name,
        t.price as treatment_price
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      WHERE a.appointment_date >= $1
        AND a.appointment_date <= $2
        ${staffCondition}
      ORDER BY a.appointment_date, a.start_time
    `,
      params
    );

    return result.rows;
  }

  /**
   * Helper to convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper to convert minutes to time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }
}

export const appointmentService = new AppointmentService();
