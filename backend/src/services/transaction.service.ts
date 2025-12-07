import { pool } from "../config/database";
import AppError from "../utils/appError";
import { logger } from "../utils/logger";

interface CreateTransactionData {
  client_id?: string;
  items: any[];
  subtotal: number;
  discount: {
    type: string;
    value: number;
    reason?: string;
  };
  discount_amount: number;
  tax: number;
  tips: Record<string, number>;
  tips_total: number;
  total: number;
  payments: any[];
  payment_method: string;
  loyalty_points_earned: number;
  loyalty_points_redeemed: number;
  status: string;
  created_by: string;
}

export class TransactionService {
  /**
   * Find all transactions
   */
  async findAll(filters: {
    client_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      client_id,
      status,
      date_from,
      date_to,
      page = 1,
      limit = 50,
    } = filters;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (client_id) {
      conditions.push(`client_id = $${paramIndex++}`);
      params.push(client_id);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (date_from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(date_from);
    }

    if (date_to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(date_to);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit, offset);

    const query = `
      SELECT * FROM transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM transactions ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    return {
      transactions: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string) {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Transaction not found");
    }

    return result.rows[0];
  }

  /**
   * Create new transaction
   */
  async create(data: CreateTransactionData) {
    const result = await pool.query(
      `INSERT INTO transactions (
        client_id, items, subtotal, discount, discount_amount, tax,
        tips, tips_total, total, payments, payment_method,
        loyalty_points_earned, loyalty_points_redeemed, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        data.client_id || null,
        JSON.stringify(data.items),
        data.subtotal,
        JSON.stringify(data.discount),
        data.discount_amount,
        data.tax,
        JSON.stringify(data.tips),
        data.tips_total,
        data.total,
        JSON.stringify(data.payments),
        data.payment_method,
        data.loyalty_points_earned,
        data.loyalty_points_redeemed,
        data.status,
        data.created_by,
      ]
    );

    logger.info(`Transaction created: ${result.rows[0].id}`);
    return result.rows[0];
  }

  /**
   * Update transaction
   */
  async update(id: string, data: Partial<CreateTransactionData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE transactions
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Transaction not found");
    }

    logger.info(`Transaction updated: ${id}`);
    return result.rows[0];
  }
}

export const transactionService = new TransactionService();
