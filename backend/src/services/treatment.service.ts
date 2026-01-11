import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

interface CreateTreatmentData {
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  pricing_type?: "fixed" | "from";
  price_range_max?: number;
  category?: string;
  benefits?: string[];
  contraindications?: string[];
  preparation_instructions?: string;
  aftercare_instructions?: string;
  available_for?: string[];
  image_url?: string;
  is_active?: boolean;
  tags?: string[];
}

export class TreatmentService {
  /**
   * Find all treatments with filters
   */
  async findAll(filters: {
    category?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { category, is_active, search, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(is_active);
    }

    if (search) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit, offset);

    const query = `
      SELECT * FROM treatments
      ${whereClause}
      ORDER BY popularity_score DESC NULLS LAST, name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM treatments ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    return {
      treatments: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Find treatment by ID
   */
  async findById(id: string) {
    const result = await pool.query("SELECT * FROM treatments WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      throw AppError.notFound("Treatment not found");
    }

    return result.rows[0];
  }

  /**
   * Create new treatment
   */
  async create(data: CreateTreatmentData) {
    const result = await pool.query(
      `INSERT INTO treatments (
        name, description, duration_minutes, price, pricing_type, price_range_max,
        category, benefits, contraindications, preparation_instructions,
        aftercare_instructions, available_for, image_url, is_active, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        data.name,
        data.description || null,
        data.duration_minutes,
        data.price,
        data.pricing_type || "fixed",
        data.price_range_max || null,
        data.category || null,
        data.benefits || [],
        data.contraindications || [],
        data.preparation_instructions || null,
        data.aftercare_instructions || null,
        data.available_for || [],
        data.image_url || null,
        data.is_active !== false,
        data.tags || [],
      ]
    );

    logger.info(`Treatment created: ${result.rows[0].id}`);
    return result.rows[0];
  }

  /**
   * Update treatment
   */
  async update(id: string, data: Partial<CreateTreatmentData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: "name",
      description: "description",
      duration_minutes: "duration_minutes",
      price: "price",
      pricing_type: "pricing_type",
      price_range_max: "price_range_max",
      category: "category",
      benefits: "benefits",
      contraindications: "contraindications",
      preparation_instructions: "preparation_instructions",
      aftercare_instructions: "aftercare_instructions",
      available_for: "available_for",
      image_url: "image_url",
      is_active: "is_active",
      tags: "tags",
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof CreateTreatmentData] !== undefined) {
        fields.push(`${dbField} = $${paramIndex++}`);
        values.push(data[key as keyof CreateTreatmentData]);
      }
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE treatments
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Treatment not found");
    }

    logger.info(`Treatment updated: ${id}`);
    return result.rows[0];
  }

  /**
   * Delete treatment
   */
  async delete(id: string) {
    const result = await pool.query(
      "UPDATE treatments SET is_active = false WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Treatment not found");
    }

    logger.info(`Treatment deactivated: ${id}`);
  }
}

export const treatmentService = new TreatmentService();
