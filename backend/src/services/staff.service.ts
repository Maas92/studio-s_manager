import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

export interface CreateStaffData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  specializations?: string[];
  status?: "active" | "inactive" | "on_leave";
  hireDate?: string;
  bio?: string;
  certifications?: string[];
  schedule?: Record<string, string>;
  avatar?: string;
}

export class StaffService {
  /**
   * Format DB row → API response
   */
  private formatStaff(row: any) {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      specializations: row.specializations ?? [],
      status: row.status,
      hireDate: row.hire_date,
      bio: row.bio,
      certifications: (() => {
        if (Array.isArray(row.certifications)) return row.certifications;
        if (typeof row.certifications === "string") {
          try {
            const parsed = JSON.parse(row.certifications);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      })(),

      schedule:
        row.schedule && typeof row.schedule === "string"
          ? JSON.parse(row.schedule)
          : row.schedule,
      avatar: row.avatar,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Find all staff
   */
  async findAll(filters: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { role, status, search, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (role) {
      conditions.push(`role = $${i++}`);
      params.push(role);
    }

    if (status) {
      conditions.push(`status = $${i++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(
        `(first_name ILIKE $${i} OR last_name ILIKE $${i} OR email ILIKE $${i})`
      );
      params.push(`%${search}%`);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT * FROM staff
      ${where}
      ORDER BY first_name ASC
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM staff ${where}`;

    const [rows, count] = await Promise.all([
      pool.query(query, [...params, limit, offset]),
      pool.query(countQuery, params),
    ]);

    return {
      staff: rows.rows.map(this.formatStaff),
      total: Number(count.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(count.rows[0].count) / limit),
    };
  }

  /**
   * Find staff by ID
   */
  async findById(id: string) {
    const result = await pool.query(`SELECT * FROM staff WHERE id = $1`, [id]);

    if (!result.rows.length) {
      throw AppError.notFound("Staff member not found");
    }

    return this.formatStaff(result.rows[0]);
  }

  /**
   * Create staff
   */
  async create(data: CreateStaffData) {
    if (!data.firstName || !data.lastName) {
      throw AppError.badRequest("firstName and lastName are required");
    }

    const result = await pool.query(
      `
      INSERT INTO staff (
        first_name,
        last_name,
        email,
        phone,
        role,
        specializations,
        status,
        hire_date,
        bio,
        certifications,
        schedule,
        avatar
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        data.firstName,
        data.lastName,
        data.email ?? null,
        data.phone ?? null,
        data.role,
        data.specializations ?? [],
        data.status ?? "active",
        data.hireDate && data.hireDate !== "" ? data.hireDate : null,
        data.bio ?? null,
        data.certifications ?? [],
        data.schedule ? JSON.stringify(data.schedule) : null,
        data.avatar ?? null,
      ]
    );

    logger.info(`Staff member created: ${result.rows[0].id}`);
    return this.formatStaff(result.rows[0]);
  }

  /**
   * Update staff
   */
  async update(id: string, data: Partial<CreateStaffData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.firstName !== undefined) {
      fields.push(`first_name = $${i++}`);
      values.push(data.firstName);
    }

    if (data.lastName !== undefined) {
      fields.push(`last_name = $${i++}`);
      values.push(data.lastName);
    }

    if (data.email !== undefined) {
      fields.push(`email = $${i++}`);
      values.push(data.email);
    }

    if (data.phone !== undefined) {
      fields.push(`phone = $${i++}`);
      values.push(data.phone);
    }

    if (data.role !== undefined) {
      fields.push(`role = $${i++}`);
      values.push(data.role);
    }

    if (data.specializations !== undefined) {
      fields.push(`specializations = $${i++}`);
      values.push(data.specializations);
    }

    if (data.status !== undefined) {
      fields.push(`status = $${i++}`);
      values.push(data.status);
    }

    if (data.hireDate !== undefined) {
      fields.push(`hire_date = $${i++}`);
      values.push(data.hireDate);
    }

    if (data.bio !== undefined) {
      fields.push(`bio = $${i++}`);
      values.push(data.bio);
    }

    if (data.certifications !== undefined) {
      fields.push(`certifications = $${i++}`);
      values.push(data.certifications);
    }

    if (data.schedule !== undefined) {
      fields.push(`schedule = $${i++}`);
      values.push(data.schedule ? JSON.stringify(data.schedule) : null);
    }

    if (data.avatar !== undefined) {
      fields.push(`avatar = $${i++}`);
      values.push(data.avatar);
    }

    if (!fields.length) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(id);

    const result = await pool.query(
      `
      UPDATE staff
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING *
      `,
      values
    );

    if (!result.rows.length) {
      throw AppError.notFound("Staff member not found");
    }

    logger.info(`Staff member updated: ${id}`);
    return this.formatStaff(result.rows[0]);
  }

  /**
   * Soft delete
   */
  async delete(id: string) {
    const result = await pool.query(
      `UPDATE staff SET status = 'inactive' WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rows.length) {
      throw AppError.notFound("Staff member not found");
    }

    logger.info(`Staff member deactivated: ${id}`);
  }

  /**
   * Performance metrics
   */
  async getPerformance(id: string, period: string) {
    const result = await pool.query(
      `
      SELECT 
        s.id AS staff_id,
        $2 AS period,
        COUNT(b.id) FILTER (WHERE b.status = 'completed') AS appointments_completed,
        COUNT(b.id) FILTER (WHERE b.status = 'cancelled') AS appointments_cancelled,
        COALESCE(SUM(sa.final_amount), 0) AS total_revenue,
        COUNT(b.id) FILTER (WHERE b.no_show = true) AS no_shows
      FROM staff s
      LEFT JOIN bookings b ON b.staff_id = s.id
      LEFT JOIN sales sa ON sa.booking_id = b.id
      WHERE s.id = $1
      GROUP BY s.id
      `,
      [id, period]
    );

    if (!result.rows.length) {
      throw AppError.notFound("Staff member not found");
    }

    const row = result.rows[0];

    return {
      staffId: row.staff_id,
      period: row.period,
      appointmentsCompleted: Number(row.appointments_completed) || 0,
      appointmentsCancelled: Number(row.appointments_cancelled) || 0,
      totalRevenue: Number(row.total_revenue) || 0,
      noShows: Number(row.no_shows) || 0,
    };
  }
}

export const staffService = new StaffService();
