import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";

export type CreateStaffLeaveInput = {
  staff_id: string;
  start_date: string;
  end_date: string;
  leave_type:
    | "annual"
    | "sick"
    | "unpaid"
    | "maternity"
    | "paternity"
    | "study"
    | "other";
  reason?: string;
  approved_by?: string;
};

export const staffLeaveService = {
  async listByStaff(staffId: string) {
    const data = await pool.query(
      `SELECT * FROM staff_leave WHERE staff_id = $1 ORDER BY start_date DESC`,
      [staffId]
    );

    if (data.rows.length === 0) {
      throw AppError.notFound("Staff leave records not found");
    }

    return data;
  },

  async create(input: CreateStaffLeaveInput) {
    const data = await pool.query(
      `INSERT INTO staff_leave (
        staff_id,
        start_date,
        end_date,
        leave_type,
        reason,
        approved_by,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'approved') RETURNING *`,
      [
        input.staff_id,
        input.start_date,
        input.end_date,
        input.leave_type,
        input.reason || null,
        input.approved_by || null,
      ]
    );

    if (data.rows.length === 0) {
      throw AppError.notFound("Failed to create staff leave record");
    }

    return data;
  },

  async cancel(leaveId: string) {
    const data = await pool.query(
      `UPDATE staff_leave SET status = 'cancelled' WHERE id = $1`,
      [leaveId]
    );

    if (data.rows.length === 0) {
      throw AppError.notFound("Failed to cancel staff leave record");
    }
  },
};
