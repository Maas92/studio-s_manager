import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

export interface CreateKPIData {
  staffId: string;
  month: string;
  reviewerId: string;
  reviewerName: string;
  categories: any[];
  comments?: string;
  status?: "draft" | "completed" | "reviewed";
}

export class StaffKPIService {
  /**
   * Calculate total score from categories
   */
  private calculateTotalScore(categories: any[]): number {
    let totalScore = 0;

    for (const category of categories) {
      const items = category.items || [];
      const validScores = items.filter((item: any) => item.score !== null);

      if (validScores.length === 0) continue;

      const categoryAvg =
        validScores.reduce((sum: number, item: any) => sum + item.score, 0) /
        validScores.length;

      const weightedScore = categoryAvg * category.weight;
      totalScore += weightedScore;
    }

    return Math.round(totalScore * 100) / 100;
  }

  /**
   * Format DB row → API response
   */
  private formatKPI(row: any) {
    return {
      id: row.id,
      staffId: row.staff_id,
      month: row.month,
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_name,
      categories: row.categories,
      totalScore: parseFloat(row.total_score),
      comments: row.comments,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Find all KPIs for a staff member
   */
  async findByStaffId(
    staffId: string,
    filters?: { month?: string; status?: string },
  ) {
    const conditions: string[] = ["staff_id = $1"];
    const params: any[] = [staffId];
    let i = 2;

    if (filters?.month) {
      conditions.push(`month = $${i++}`);
      params.push(filters.month);
    }

    if (filters?.status) {
      conditions.push(`status = $${i++}`);
      params.push(filters.status);
    }

    const where = conditions.join(" AND ");

    const result = await pool.query(
      `SELECT * FROM staff_kpis WHERE ${where} ORDER BY month DESC`,
      params,
    );

    return result.rows.map(this.formatKPI);
  }

  /**
   * Find KPI by ID
   */
  async findById(id: string) {
    const result = await pool.query(`SELECT * FROM staff_kpis WHERE id = $1`, [
      id,
    ]);

    if (!result.rows.length) {
      throw AppError.notFound("KPI not found");
    }

    return this.formatKPI(result.rows[0]);
  }

  /**
   * Create KPI
   */
  async create(data: CreateKPIData) {
    const totalScore = this.calculateTotalScore(data.categories);

    const result = await pool.query(
      `
      INSERT INTO staff_kpis (
        staff_id,
        month,
        reviewer_id,
        reviewer_name,
        categories,
        total_score,
        comments,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        data.staffId,
        data.month,
        data.reviewerId,
        data.reviewerName,
        JSON.stringify(data.categories),
        totalScore,
        data.comments || null,
        data.status || "draft",
      ],
    );

    logger.info(`Staff KPI created: ${result.rows[0].id}`);
    return this.formatKPI(result.rows[0]);
  }

  /**
   * Update KPI
   */
  async update(id: string, data: Partial<CreateKPIData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.categories !== undefined) {
      const totalScore = this.calculateTotalScore(data.categories);
      fields.push(`categories = $${i++}`);
      values.push(JSON.stringify(data.categories));
      fields.push(`total_score = $${i++}`);
      values.push(totalScore);
    }

    if (data.comments !== undefined) {
      fields.push(`comments = $${i++}`);
      values.push(data.comments);
    }

    if (data.status !== undefined) {
      fields.push(`status = $${i++}`);
      values.push(data.status);
    }

    if (!fields.length) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(id);

    const result = await pool.query(
      `
      UPDATE staff_kpis
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING *
      `,
      values,
    );

    if (!result.rows.length) {
      throw AppError.notFound("KPI not found");
    }

    logger.info(`Staff KPI updated: ${id}`);
    return this.formatKPI(result.rows[0]);
  }

  /**
   * Delete KPI
   */
  async delete(id: string) {
    const result = await pool.query(
      `DELETE FROM staff_kpis WHERE id = $1 RETURNING id`,
      [id],
    );

    if (!result.rows.length) {
      throw AppError.notFound("KPI not found");
    }

    logger.info(`Staff KPI deleted: ${id}`);
  }

  /**
   * Get KPI summary for staff member
   */
  async getSummary(staffId: string, year: number) {
    const result = await pool.query(
      `
      SELECT 
        month,
        total_score,
        status
      FROM staff_kpis
      WHERE staff_id = $1 AND month LIKE $2
      ORDER BY month ASC
      `,
      [staffId, `${year}-%`],
    );

    return result.rows.map((row) => ({
      month: row.month,
      totalScore: parseFloat(row.total_score),
      status: row.status,
    }));
  }
}

export const staffKPIService = new StaffKPIService();
