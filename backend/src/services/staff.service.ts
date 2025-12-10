import { pool } from '../config/database.js';
import AppError from '../utils/appError.js';
import { logger } from '../utils/logger.js';

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
      staff: dataResult.rows,
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

    return result.rows[0];
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
    return result.rows[0];
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
    return result.rows[0];
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
    const result = await pool.query(
      `SELECT 
        s.id as staff_id,
        $2 as period,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as appointments_completed,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'cancelled') as appointments_cancelled,
        COALESCE(SUM(sale.final_amount), 0) as total_revenue,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'no_show') as no_shows
      FROM staff s
      LEFT JOIN appointments a ON s.id = a.staff_id
      LEFT JOIN sales sale ON a.id = sale.appointment_id
      WHERE s.id = $1
      GROUP BY s.id`,
      [id, period]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Staff member not found");
    }

    return result.rows[0];
  }
}

export const staffService = new StaffService();
