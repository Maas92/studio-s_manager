import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

interface CreateStaffData {
  name: string;
  email?: string;
  phone?: string;
  role: string;
  specializations?: string[];
  status?: "active" | "inactive" | "on_leave";
  hire_date?: string;
  bio?: string;
  certifications?: string[];
  schedule?: Record<string, string>;
  avatar?: string;
}

export class StaffService {
  /**
   * Format staff object for response
   */
  private formatStaff(staff: any) {
    // Parse name into firstName and lastName
    const nameParts = staff.name?.trim().split(/\s+/) || ["", ""];

    return {
      id: staff.id,
      name: staff.name,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      specializations: staff.specializations || [],
      status: staff.status,
      hireDate: staff.hire_date,
      bio: staff.bio,
      certifications: staff.certifications || [],
      schedule: staff.schedule
        ? typeof staff.schedule === "string"
          ? JSON.parse(staff.schedule)
          : staff.schedule
        : null,
      avatar: staff.avatar,
      createdAt: staff.created_at,
      updatedAt: staff.updated_at,
    };
  }

  /**
   * Find all staff members
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

    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (role) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit, offset);

    const query = `
      SELECT * FROM staff
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM staff ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    return {
      staff: dataResult.rows.map(this.formatStaff.bind(this)),
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Find staff by ID
   */
  async findById(id: string) {
    const result = await pool.query("SELECT * FROM staff WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      throw AppError.notFound("Staff member not found");
    }

    return this.formatStaff(result.rows[0]);
  }

  /**
   * Create new staff member
   */
  async create(data: CreateStaffData) {
    const result = await pool.query(
      `INSERT INTO staff (
        name, email, phone, role, specializations, status,
        hire_date, bio, certifications, schedule, avatar
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.name,
        data.email || null,
        data.phone || null,
        data.role,
        data.specializations || [],
        data.status || "active",
        data.hire_date || null,
        data.bio || null,
        data.certifications || [],
        data.schedule ? JSON.stringify(data.schedule) : null,
        data.avatar || null,
      ]
    );

    logger.info(`Staff member created: ${result.rows[0].id}`);
    return this.formatStaff(result.rows[0]);
  }

  /**
   * Update staff member
   */
  async update(id: string, data: Partial<CreateStaffData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: "name",
      email: "email",
      phone: "phone",
      role: "role",
      specializations: "specializations",
      status: "status",
      hire_date: "hire_date",
      bio: "bio",
      certifications: "certifications",
      schedule: "schedule",
      avatar: "avatar",
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof CreateStaffData] !== undefined) {
        let value = data[key as keyof CreateStaffData];
        if (key === "schedule" && value) {
          value = JSON.stringify(value);
        }
        fields.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE staff
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Staff member not found");
    }

    logger.info(`Staff member updated: ${id}`);
    return this.formatStaff(result.rows[0]);
  }

  /**
   * Delete staff member
   */
  async delete(id: string) {
    const result = await pool.query(
      "UPDATE staff SET status = 'inactive' WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Staff member not found");
    }

    logger.info(`Staff member deactivated: ${id}`);
  }

  /**
   * Get staff performance
   */
  async getPerformance(id: string, period: string) {
    // Use 'bookings' table instead of 'appointments'
    const result = await pool.query(
      `SELECT 
        s.id as staff_id,
        $2 as period,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as appointments_completed,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'cancelled') as appointments_cancelled,
        COALESCE(SUM(sale.final_amount), 0) as total_revenue,
        COUNT(DISTINCT b.id) FILTER (WHERE b.no_show = true) as no_shows
      FROM staff s
      LEFT JOIN bookings b ON s.id = b.staff_id
      LEFT JOIN sales sale ON b.id = sale.booking_id
      WHERE s.id = $1
      GROUP BY s.id`,
      [id, period]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Staff member not found");
    }

    return {
      staffId: result.rows[0].staff_id,
      period: result.rows[0].period,
      appointmentsCompleted:
        parseInt(result.rows[0].appointments_completed) || 0,
      appointmentsCancelled:
        parseInt(result.rows[0].appointments_cancelled) || 0,
      totalRevenue: parseFloat(result.rows[0].total_revenue) || 0,
      noShows: parseInt(result.rows[0].no_shows) || 0,
    };
  }
}

export const staffService = new StaffService();
