import { pool, supabase } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

interface CreateCashUpData {
  openingFloat: number;
  sessionDate: string;
}

interface UpdateCashUpData {
  openingFloat?: number;
  actualCash?: number;
  notes?: string;
}

interface ExpenseData {
  description: string;
  amount: number;
  category: string;
  requiresApproval?: boolean;
}

interface SafeDropData {
  amount: number;
  reason?: string;
  notes?: string;
}

export class CashUpService {
  /* =====================
     CASH-UP CORE
     ===================== */

  async create(userId: string, data: CreateCashUpData) {
    const existing = await pool.query(
      `SELECT id FROM cash_ups WHERE session_date = $1`,
      [data.sessionDate]
    );

    if (existing.rows.length > 0) {
      throw AppError.conflict("Cash-up session already exists for this date");
    }

    const transactions = await this.getTransactionsForDate(data.sessionDate);

    const result = await pool.query(
      `INSERT INTO cash_ups (
        user_id,
        session_date,
        opening_float,
        total_sales,
        cash_sales,
        card_sales,
        other_payments,
        expected_cash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        userId,
        data.sessionDate,
        data.openingFloat,
        transactions.totalSales,
        transactions.cashSales,
        transactions.cardSales,
        transactions.otherPayments,
        data.openingFloat + transactions.cashSales,
      ]
    );

    logger.info(
      { cashUpId: result.rows[0].id, sessionDate: data.sessionDate },
      "Cash-up session created"
    );

    return this.formatCashUp(result.rows[0]);
  }

  private async getTransactionsForDate(date: string) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as transaction_count,
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(SUM(
            CASE 
              WHEN payments IS NOT NULL THEN 
                (SELECT COALESCE(SUM((p->>'amount')::numeric), 0)
                 FROM jsonb_array_elements(payments) p
                 WHERE p->>'method' = 'cash')
              ELSE 0
            END
          ),0) as cash_sales,
          COALESCE(SUM(
            CASE 
              WHEN payments IS NOT NULL THEN 
                (SELECT COALESCE(SUM((p->>'amount')::numeric), 0)
                 FROM jsonb_array_elements(payments) p
                 WHERE p->>'method' = 'card')
              ELSE 0
            END
          ),0) as card_sales,
          COALESCE(SUM(
            CASE 
              WHEN payments IS NOT NULL THEN 
                (SELECT COALESCE(SUM((p->>'amount')::numeric), 0)
                 FROM jsonb_array_elements(payments) p
                 WHERE p->>'method' NOT IN ('cash','card'))
              ELSE 0
            END
          ),0) as other_payments
        FROM transactions
        WHERE DATE(created_at) = $1
          AND status = 'completed'`,
        [date]
      );

      return {
        transactionCount: Number(result.rows[0].transaction_count),
        totalSales: Number(result.rows[0].total_sales),
        cashSales: Number(result.rows[0].cash_sales),
        cardSales: Number(result.rows[0].card_sales),
        otherPayments: Number(result.rows[0].other_payments),
      };
    } catch (error: any) {
      logger.warn(
        { date, error: error.message },
        "Failed to query transactions, defaulting to zero"
      );

      return {
        transactionCount: 0,
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        otherPayments: 0,
      };
    }
  }

  /* =====================
     FINDERS
     ===================== */

  public async findAll(filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, startDate, endDate, page = 1, limit = 30 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT e.id) as expense_count,
        COUNT(DISTINCT sd.id) as safe_drop_count
      FROM cash_ups c
      LEFT JOIN cash_up_expenses e ON c.id = e.cash_up_id
      LEFT JOIN safe_drops sd ON c.id = sd.cash_up_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let i = 1;

    if (status) {
      query += ` AND c.status = $${i++}`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND c.session_date >= $${i++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND c.session_date <= $${i++}`;
      params.push(endDate);
    }

    query += `
      GROUP BY c.id
      ORDER BY c.session_date DESC, c.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `;

    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(`SELECT COUNT(*) FROM cash_ups`),
    ]);

    return {
      cashUps: dataResult.rows.map((r) => this.formatCashUp(r)),
      total: Number(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(countResult.rows[0].count) / limit),
    };
  }

  public async findById(id: string) {
    const result = await pool.query(
      `SELECT 
        c.*,
        json_agg(DISTINCT e.*) FILTER (WHERE e.id IS NOT NULL) as expenses,
        json_agg(DISTINCT sd.*) FILTER (WHERE sd.id IS NOT NULL) as safe_drops
      FROM cash_ups c
      LEFT JOIN cash_up_expenses e ON c.id = e.cash_up_id
      LEFT JOIN safe_drops sd ON c.id = sd.cash_up_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id]
    );

    if (!result.rows.length) {
      throw AppError.notFound("Cash-up session not found");
    }

    return this.formatCashUp(result.rows[0], true);
  }

  /* =====================
     UPDATES
     ===================== */

  public async update(id: string, data: UpdateCashUpData) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.openingFloat !== undefined) {
      fields.push(`opening_float = $${i++}`);
      values.push(data.openingFloat);
    }

    if (data.actualCash !== undefined) {
      fields.push(`actual_cash = $${i++}`);
      values.push(data.actualCash);
      fields.push(`variance = $${i++} - expected_cash`);
      values.push(data.actualCash);
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${i++}`);
      values.push(data.notes);
    }

    if (!fields.length) {
      throw AppError.badRequest("No fields to update");
    }

    const result = await pool.query(
      `UPDATE cash_ups
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${i}
       RETURNING *`,
      [...values, id]
    );

    logger.info({ cashUpId: id }, "Cash-up updated");
    return this.formatCashUp(result.rows[0]);
  }

  public async complete(
    userId: string,
    id: string,
    actualCash: number,
    notes?: string
  ) {
    const result = await pool.query(
      `UPDATE cash_ups
       SET actual_cash = $1,
           variance = $1 - expected_cash,
           notes = COALESCE($2, notes),
           status = 'completed',
           completed_by = $3,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4 AND status = 'in_progress'
       RETURNING *`,
      [actualCash, notes, userId, id]
    );

    logger.info({ cashUpId: id }, "Cash-up completed");
    return this.formatCashUp(result.rows[0]);
  }

  public async reconcile(userId: string, id: string, notes?: string) {
    const result = await pool.query(
      `UPDATE cash_ups
       SET status = 'reconciled',
           reconciliation_notes = $1,
           reconciled_by = $2,
           reconciled_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 AND status = 'completed'
       RETURNING *`,
      [notes, userId, id]
    );

    logger.info({ cashUpId: id }, "Cash-up reconciled");
    return this.formatCashUp(result.rows[0]);
  }

  /* =====================
     EXPENSES
     ===================== */

  public async addExpense(userId: string, cashUpId: string, data: ExpenseData) {
    const result = await pool.query(
      `INSERT INTO cash_up_expenses (
        cash_up_id, user_id, description, amount, category, requires_approval
      ) VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        cashUpId,
        userId,
        data.description,
        data.amount,
        data.category,
        !!data.requiresApproval,
      ]
    );

    await this.updateCashUpTotals(cashUpId);

    logger.info({ cashUpId }, "Expense added");
    return this.formatExpense(result.rows[0]);
  }

  public async deleteExpense(expenseId: string) {
    const result = await pool.query(
      `DELETE FROM cash_up_expenses WHERE id = $1 RETURNING cash_up_id`,
      [expenseId]
    );

    if (!result.rows.length) {
      throw AppError.notFound("Expense not found");
    }

    await this.updateCashUpTotals(result.rows[0].cash_up_id);
    logger.info({ expenseId }, "Expense deleted");
  }

  /**
   * Update expense
   */
  public async updateExpense(expenseId: string, data: Partial<ExpenseData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.description !== undefined) {
      fields.push(`description = $${i++}`);
      values.push(data.description);
    }

    if (data.amount !== undefined) {
      fields.push(`amount = $${i++}`);
      values.push(data.amount);
    }

    if (data.category !== undefined) {
      fields.push(`category = $${i++}`);
      values.push(data.category);
    }

    if (data.requiresApproval !== undefined) {
      fields.push(`requires_approval = $${i++}`);
      values.push(data.requiresApproval);
    }

    if (!fields.length) {
      throw AppError.badRequest("No fields to update");
    }

    const result = await pool.query(
      `UPDATE cash_up_expenses
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${i}
     RETURNING *`,
      [...values, expenseId]
    );

    if (!result.rows.length) {
      throw AppError.notFound("Expense not found");
    }

    await this.updateCashUpTotals(result.rows[0].cash_up_id);

    logger.info({ expenseId }, "Expense updated");

    return this.formatExpense(result.rows[0]);
  }

  /**
   * Upload expense receipt
   */
  public async uploadReceipt(
    userId: string,
    expenseId: string,
    file: Express.Multer.File
  ) {
    const expenseResult = await pool.query(
      `SELECT id FROM cash_up_expenses WHERE id = $1`,
      [expenseId]
    );

    if (!expenseResult.rows.length) {
      throw AppError.notFound("Expense not found");
    }

    const fileExt = file.originalname.split(".").pop();
    const fileName = `${userId}/${expenseId}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("expense-receipts")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      logger.error({ expenseId, error }, "Failed to upload expense receipt");
      throw AppError.internal("Failed to upload receipt");
    }

    const { data: urlData } = supabase.storage
      .from("expense-receipts")
      .getPublicUrl(fileName);

    const updateResult = await pool.query(
      `UPDATE cash_up_expenses
     SET receipt_url = $1,
         receipt_file_name = $2,
         has_receipt = true,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
      [urlData.publicUrl, file.originalname, expenseId]
    );

    logger.info({ expenseId }, "Expense receipt uploaded");

    return this.formatExpense(updateResult.rows[0]);
  }

  /* =====================
     SAFE DROPS
     ===================== */

  public async addSafeDrop(
    userId: string,
    cashUpId: string,
    data: SafeDropData
  ) {
    const result = await pool.query(
      `INSERT INTO safe_drops (
        cash_up_id, user_id, amount, reason, notes
      ) VALUES ($1,$2,$3,$4,$5)
      RETURNING *`,
      [cashUpId, userId, data.amount, data.reason, data.notes]
    );

    await this.updateCashUpTotals(cashUpId);
    logger.info({ cashUpId }, "Safe drop added");
    return this.formatSafeDrop(result.rows[0]);
  }

  public async deleteSafeDrop(dropId: string) {
    const result = await pool.query(
      `DELETE FROM safe_drops WHERE id = $1 RETURNING cash_up_id`,
      [dropId]
    );

    if (!result.rows.length) {
      throw AppError.notFound("Safe drop not found");
    }

    await this.updateCashUpTotals(result.rows[0].cash_up_id);
    logger.info({ dropId }, "Safe drop deleted");
  }

  /**
   * Update safe drop
   */
  public async updateSafeDrop(dropId: string, data: Partial<SafeDropData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.amount !== undefined) {
      fields.push(`amount = $${i++}`);
      values.push(data.amount);
    }

    if (data.reason !== undefined) {
      fields.push(`reason = $${i++}`);
      values.push(data.reason);
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${i++}`);
      values.push(data.notes);
    }

    if (!fields.length) {
      throw AppError.badRequest("No fields to update");
    }

    const result = await pool.query(
      `UPDATE safe_drops
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${i}
     RETURNING *`,
      [...values, dropId]
    );

    if (!result.rows.length) {
      throw AppError.notFound("Safe drop not found");
    }

    await this.updateCashUpTotals(result.rows[0].cash_up_id);

    logger.info({ dropId }, "Safe drop updated");

    return this.formatSafeDrop(result.rows[0]);
  }

  /**
   * Get daily snapshot (current session)
   */
  public async getDailySnapshot() {
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `SELECT *
     FROM cash_ups
     WHERE session_date = $1
     ORDER BY created_at DESC
     LIMIT 1`,
      [today]
    );

    if (!result.rows.length) {
      return null;
    }

    return this.formatCashUp(result.rows[0]);
  }

  /**
   * Get cash-up summary / statistics
   */
  public async getSummary(startDate?: string, endDate?: string) {
    let query = `
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
      COUNT(*) FILTER (WHERE status = 'reconciled') as reconciled_sessions,
      COALESCE(SUM(total_sales), 0) as total_sales,
      COALESCE(SUM(cash_sales), 0) as total_cash_sales,
      COALESCE(SUM(card_sales), 0) as total_card_sales,
      COALESCE(SUM(total_expenses), 0) as total_expenses,
      COALESCE(SUM(total_safe_drops), 0) as total_safe_drops,
      COALESCE(SUM(ABS(variance)), 0) as total_variance,
      COALESCE(AVG(ABS(variance)), 0) as avg_variance
    FROM cash_ups
    WHERE 1=1
  `;

    const params: any[] = [];
    let i = 1;

    if (startDate) {
      query += ` AND session_date >= $${i++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND session_date <= $${i++}`;
      params.push(endDate);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /* =====================
     HELPERS
     ===================== */

  private async updateCashUpTotals(cashUpId: string) {
    await pool.query(
      `UPDATE cash_ups
       SET total_expenses = (
         SELECT COALESCE(SUM(amount),0)
         FROM cash_up_expenses WHERE cash_up_id = $1
       ),
       total_safe_drops = (
         SELECT COALESCE(SUM(amount),0)
         FROM safe_drops WHERE cash_up_id = $1
       ),
       expected_cash = opening_float + cash_sales
         - COALESCE((SELECT SUM(amount) FROM cash_up_expenses WHERE cash_up_id = $1),0)
         - COALESCE((SELECT SUM(amount) FROM safe_drops WHERE cash_up_id = $1),0),
       updated_at = NOW()
       WHERE id = $1`,
      [cashUpId]
    );
  }

  /* =====================
     FORMATTERS
     ===================== */

  private formatCashUp(c: any, includeDetails = false) {
    return {
      id: c.id,
      sessionDate: c.session_date,
      status: c.status,
      openingFloat: Number(c.opening_float),
      totalSales: Number(c.total_sales),
      cashSales: Number(c.cash_sales),
      cardSales: Number(c.card_sales),
      otherPayments: Number(c.other_payments),
      expectedCash: Number(c.expected_cash),
      actualCash: c.actual_cash ? Number(c.actual_cash) : null,
      variance: c.variance ? Number(c.variance) : null,
      totalExpenses: Number(c.total_expenses),
      totalSafeDrops: Number(c.total_safe_drops),
      expenses: includeDetails ? (c.expenses ?? []) : undefined,
      safeDrops: includeDetails ? (c.safe_drops ?? []) : undefined,
    };
  }

  private formatExpense(e: any) {
    return {
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      category: e.category,
      hasReceipt: e.has_receipt,
      receiptUrl: e.receipt_url,
      createdAt: e.created_at,
    };
  }

  private formatSafeDrop(sd: any) {
    return {
      id: sd.id,
      amount: Number(sd.amount),
      reason: sd.reason,
      notes: sd.notes,
      createdAt: sd.created_at,
    };
  }
}

export const cashUpService = new CashUpService();
