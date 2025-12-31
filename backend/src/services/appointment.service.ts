import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

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
  staff_id?: string;
  treatment_id: string;
  datetime_iso: string;
  notes?: string;
  created_by?: string;
}

export class AppointmentService {
  private async getServiceDuration(treatment_id: string): Promise<number> {
    const result = await pool.query(
      `
    SELECT duration_minutes
    FROM treatments
    WHERE id = $1
    `,
      [treatment_id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Service not found");
    }

    return result.rows[0].duration_minutes;
  }

  /**
   * Find all appointments with filters
   * FIXED: Use 'bookings' table and 'services' table
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

    // Default: exclude cancelled
    if (!status) {
      conditions.push(`b.status != 'cancelled'`);
    }

    if (status) {
      conditions.push(`b.status = $${paramIndex++}`);
      params.push(status);
    }

    if (client_id) {
      conditions.push(`b.client_id = $${paramIndex++}`);
      params.push(client_id);
    }

    if (staff_id) {
      conditions.push(`b.staff_id = $${paramIndex++}`);
      params.push(staff_id);
    }

    if (treatment_id) {
      conditions.push(`b.treatment_id = $${paramIndex++}`);
      params.push(treatment_id);
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

    console.log(whereClause);

    const query = `
      SELECT 
        b.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        t.name as treatment_name,
        t.duration_minutes as treatment_duration,
        t.price as treatment_price
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN treatments t ON b.treatment_id = t.id
      ${whereClause}
      ORDER BY b.booking_date DESC, b.start_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN treatments t ON b.treatment_id = t.id
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
        t.name as treatment_name,
        t.description as treatment_description,
        t.duration_minutes as treatment_duration,
        t.price as treatment_price
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN treatments t ON b.treatment_id = t.id
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
    // 1. Parse start datetime
    const start = new Date(data.datetime_iso);
    if (isNaN(start.getTime())) {
      throw AppError.badRequest("Invalid appointment datetime");
    }

    const booking_date = start.toISOString().slice(0, 10); // YYYY-MM-DD
    const start_time = start.toTimeString().slice(0, 5); // HH:MM

    // 2. Get service duration
    const duration_minutes = await this.getServiceDuration(data.treatment_id);

    // 3. Calculate end time
    const end = new Date(start.getTime() + duration_minutes * 60000);
    const end_time = end.toTimeString().slice(0, 5);

    // 4. Conflict check (UNCHANGED logic, new inputs)
    if (data.staff_id) {
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
        [data.staff_id, booking_date, start_time, end_time]
      );

      if (conflictCheck.rows.length > 0) {
        throw AppError.conflict(
          "This time slot is already booked for the selected staff member"
        );
      }
    }

    // 5. Insert booking
    const result = await pool.query(
      `
    INSERT INTO bookings (
      client_id,
      staff_id,
      treatment_id,
      booking_date,
      start_time,
      end_time,
      duration_minutes,
      total_price,
      status,
      notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `,
      [
        data.client_id,
        data.staff_id || null,
        data.treatment_id,
        booking_date,
        start_time,
        end_time,
        duration_minutes,
        0, // total_price (can also be fetched from services)
        "confirmed", // default status
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
      "treatment_id",
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
      WHERE id = $1 AND status = 'confirmed'
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
      WHERE id = $2 AND status IN ('confirmed', 'in_progress')
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
        t.name as treatment_name,
        t.price as treatment_price
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN treatments t ON b.treatment_id = t.id
      WHERE b.booking_date >= $1
        AND b.booking_date <= $2
        AND b.status NOT IN ('cancelled')
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
