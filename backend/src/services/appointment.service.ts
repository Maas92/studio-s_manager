import { pool } from "../config/database";
import AppError from "../utils/appError";
import { logger } from "../utils/logger";

interface AppointmentFilters {
  client_id?: string;
  staff_id?: string;
  service_id?: string; // Changed from treatment_id
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

interface CreateAppointmentData {
  client_id: string;
  staff_id: string;
  service_id: string; // Changed from treatment_id
  booking_date: string; // Changed from appointment_date
  start_time: string;
  end_time: string;
  duration_minutes: number;
  notes?: string;
  created_by?: string;
}

export class AppointmentService {
  /**
   * Find all appointments with filters
   * FIXED: Use 'bookings' table and 'services' table
   */
  async findAll(filters: AppointmentFilters) {
    const {
      client_id,
      staff_id,
      service_id,
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
      conditions.push(`b.client_id = $${paramIndex++}`);
      params.push(client_id);
    }

    if (staff_id) {
      conditions.push(`b.staff_id = $${paramIndex++}`);
      params.push(staff_id);
    }

    if (service_id) {
      conditions.push(`b.service_id = $${paramIndex++}`);
      params.push(service_id);
    }

    if (status) {
      conditions.push(`b.status = $${paramIndex++}`);
      params.push(status);
    }

    if (date_from) {
      conditions.push(`b.booking_date >= $${paramIndex++}`);
      params.push(date_from);
    }

    if (date_to) {
      conditions.push(`b.booking_date <= $${paramIndex++}`);
      params.push(date_to);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const query = `
      SELECT 
        b.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        s.name as treatment_name,
        s.duration_minutes as treatment_duration,
        s.price as treatment_price
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN services s ON b.service_id = s.id
      ${whereClause}
      ORDER BY b.booking_date DESC, b.start_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM bookings b
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
   * FIXED: Use 'bookings' and 'services' tables
   */
  async findById(id: string) {
    const result = await pool.query(
      `
      SELECT 
        b.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        s.name as treatment_name,
        s.description as treatment_description,
        s.duration_minutes as treatment_duration,
        s.price as treatment_price
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN services s ON b.service_id = s.id
      WHERE b.id = $1
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
   * FIXED: Use 'bookings' table
   */
  async create(data: CreateAppointmentData) {
    // Check for conflicts
    const conflictCheck = await pool.query(
      `
      SELECT id FROM bookings
      WHERE staff_id = $1
        AND booking_date = $2
        AND status NOT IN ('cancelled')
        AND no_show = false
        AND (
          (start_time <= $3 AND end_time > $3)
          OR (start_time < $4 AND end_time >= $4)
          OR (start_time >= $3 AND end_time <= $4)
        )
    `,
      [data.staff_id, data.booking_date, data.start_time, data.end_time]
    );

    if (conflictCheck.rows.length > 0) {
      throw AppError.conflict(
        "This time slot is already booked for the selected staff member"
      );
    }

    const result = await pool.query(
      `
      INSERT INTO bookings (
        client_id, staff_id, service_id, 
        booking_date, start_time, end_time, 
        total_price, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        data.client_id,
        data.staff_id,
        data.service_id,
        data.booking_date,
        data.start_time,
        data.end_time,
        0, // total_price - you might want to fetch this from services table
        "scheduled",
        data.notes || null,
      ]
    );

    logger.info(`Appointment created: ${result.rows[0].id}`);
    return result.rows[0];
  }

  /**
   * Update appointment
   * FIXED: Use 'bookings' table
   */
  async update(id: string, data: Partial<CreateAppointmentData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      "client_id",
      "staff_id",
      "service_id",
      "booking_date",
      "start_time",
      "end_time",
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
      UPDATE bookings
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
   * FIXED: Use 'bookings' table
   */
  async cancel(id: string, reason?: string, cancelled_by?: string) {
    const result = await pool.query(
      `
      UPDATE bookings
      SET status = 'cancelled',
          cancellation_reason = $1,
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
      [reason || null, id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Appointment not found");
    }

    logger.info(`Appointment cancelled: ${id}`);
    return result.rows[0];
  }

  /**
   * Check-in appointment
   * FIXED: Use 'bookings' table
   */
  async checkIn(id: string) {
    const result = await pool.query(
      `
      UPDATE bookings
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
   * FIXED: Use 'bookings' table
   */
  async complete(id: string, notes?: string) {
    const result = await pool.query(
      `
      UPDATE bookings
      SET status = 'completed',
          notes = COALESCE($1, notes),
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
   * FIXED: Use 'bookings' table
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
      FROM bookings
      WHERE staff_id = $1
        AND booking_date = $2
        AND status NOT IN ('cancelled')
        AND no_show = false
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
   * FIXED: Use 'bookings' and 'services' tables
   */
  async getCalendar(start_date: string, end_date: string, staff_id?: string) {
    const params: any[] = [start_date, end_date];
    let paramIndex = 3;
    let staffCondition = "";

    if (staff_id) {
      staffCondition = `AND b.staff_id = $${paramIndex}`;
      params.push(staff_id);
    }

    const result = await pool.query(
      `
      SELECT 
        b.id,
        b.booking_date as appointment_date,
        b.start_time,
        b.end_time,
        b.status,
        c.first_name || ' ' || c.last_name as client_name,
        s.name as treatment_name,
        s.price as treatment_price
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN services s ON b.service_id = s.id
      WHERE b.booking_date >= $1
        AND b.booking_date <= $2
        ${staffCondition}
      ORDER BY b.booking_date, b.start_time
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
