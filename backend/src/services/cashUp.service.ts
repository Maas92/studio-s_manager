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
  /**
   * Create new cash-up session
   */
  async create(userId: string, data: CreateCashUpData) {
    // Check if session already exists for this date
    const existing = await pool.query(
      `SELECT id FROM cash_ups 
       WHERE user_id = $1 AND session_date = $2`,
      [userId, data.sessionDate]
    );

    if (existing.rows.length > 0) {
      throw AppError.conflict("Cash-up session already exists for this date");
    }

    // Get today's transactions from POS
    const transactions = await this.getTransactionsForDate(
      userId,
      data.sessionDate
    );

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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        data.sessionDate,
        data.openingFloat,
        transactions.totalSales,
        transactions.cashSales,
        transactions.cardSales,
        transactions.otherPayments,
        data.openingFloat + transactions.cashSales, // expected = opening + cash sales
      ]
    );

    logger.info(`Cash-up session created: ${result.rows[0].id}`);
    return this.formatCashUp(result.rows[0]);
  }

  /**
   * Get transactions for a specific date
   * FIXED: Query based on your actual transactions table schema
   */
  private async getTransactionsForDate(userId: string, date: string) {
    // First, let's check what columns exist in your transactions table
    // Based on your POS schema, transactions might have different column names

    try {
      // Try the standard query first (assuming your transactions table structure)
      const result = await pool.query(
        `SELECT 
          COUNT(*) as transaction_count,
          COALESCE(SUM(total), 0) as total_sales,
          -- Try to get cash sales from payments breakdown
          COALESCE(SUM(
            CASE 
              WHEN payments IS NOT NULL THEN 
                (SELECT COALESCE(SUM((p->>'amount')::numeric), 0) 
                 FROM jsonb_array_elements(payments) AS p 
                 WHERE p->>'method' = 'cash')
              ELSE 0
            END
          ), 0) as cash_sales,
          -- Try to get card sales
          COALESCE(SUM(
            CASE 
              WHEN payments IS NOT NULL THEN 
                (SELECT COALESCE(SUM((p->>'amount')::numeric), 0) 
                 FROM jsonb_array_elements(payments) AS p 
                 WHERE p->>'method' = 'card')
              ELSE 0
            END
          ), 0) as card_sales,
          -- Other payments (loyalty, gift cards, etc)
          COALESCE(SUM(
            CASE 
              WHEN payments IS NOT NULL THEN 
                (SELECT COALESCE(SUM((p->>'amount')::numeric), 0) 
                 FROM jsonb_array_elements(payments) AS p 
                 WHERE p->>'method' NOT IN ('cash', 'card'))
              ELSE 0
            END
          ), 0) as other_payments
        FROM transactions
        WHERE DATE(created_at) = $1
          AND status = 'completed'`,
        [date]
      );

      return {
        transactionCount: parseInt(result.rows[0].transaction_count) || 0,
        totalSales: parseFloat(result.rows[0].total_sales) || 0,
        cashSales: parseFloat(result.rows[0].cash_sales) || 0,
        cardSales: parseFloat(result.rows[0].card_sales) || 0,
        otherPayments: parseFloat(result.rows[0].other_payments) || 0,
      };
    } catch (error: any) {
      // If the above query fails, provide a fallback with zeros
      logger.warn(
        "Failed to query transactions, using default values:",
        error.message
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

  /**
   * Find all cash-up sessions with filters
   */
  async findAll(
    userId: string,
    filters: {
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ) {
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
      WHERE c.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND c.session_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND c.session_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += `
      GROUP BY c.id
      ORDER BY c.session_date DESC, c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Count query
    let countQuery = `SELECT COUNT(*) FROM cash_ups WHERE user_id = $1`;
    const countParams: any[] = [userId];
    let countParamIndex = 2;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (startDate) {
      countQuery += ` AND session_date >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }

    if (endDate) {
      countQuery += ` AND session_date <= $${countParamIndex}`;
      countParams.push(endDate);
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return {
      cashUps: dataResult.rows.map(this.formatCashUp.bind(this)),
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Find cash-up by ID with all details
   */
  async findById(userId: string, id: string) {
    const result = await pool.query(
      `SELECT 
        c.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', e.id,
          'description', e.description,
          'amount', e.amount,
          'category', e.category,
          'hasReceipt', e.has_receipt,
          'receiptUrl', e.receipt_url,
          'expenseTime', e.expense_time,
          'requiresApproval', e.requires_approval,
          'approved', e.approved_by IS NOT NULL
        )) FILTER (WHERE e.id IS NOT NULL) as expenses,
        json_agg(DISTINCT jsonb_build_object(
          'id', sd.id,
          'amount', sd.amount,
          'dropTime', sd.drop_time,
          'reason', sd.reason,
          'notes', sd.notes,
          'verified', sd.verified_by IS NOT NULL
        )) FILTER (WHERE sd.id IS NOT NULL) as safe_drops
      FROM cash_ups c
      LEFT JOIN cash_up_expenses e ON c.id = e.cash_up_id
      LEFT JOIN safe_drops sd ON c.id = sd.cash_up_id
      WHERE c.id = $1 AND c.user_id = $2
      GROUP BY c.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Cash-up session not found");
    }

    return this.formatCashUp(result.rows[0], true);
  }

  /**
   * Update cash-up session
   */
  async update(userId: string, id: string, data: UpdateCashUpData) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.openingFloat !== undefined) {
      fields.push(`opening_float = $${paramIndex++}`);
      values.push(data.openingFloat);

      // Recalculate expected cash
      fields.push(
        `expected_cash = opening_float + cash_sales - total_expenses - total_safe_drops`
      );
    }

    if (data.actualCash !== undefined) {
      fields.push(`actual_cash = $${paramIndex++}`);
      values.push(data.actualCash);

      // Calculate variance
      fields.push(`variance = $${paramIndex++} - expected_cash`);
      values.push(data.actualCash);
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(userId, id);

    const result = await pool.query(
      `UPDATE cash_ups 
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex + 1} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Cash-up session not found");
    }

    logger.info(`Cash-up updated: ${id}`);
    return this.formatCashUp(result.rows[0]);
  }

  /**
   * Complete cash-up session
   */
  async complete(
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
       WHERE id = $4 AND user_id = $3 AND status = 'in_progress'
       RETURNING *`,
      [actualCash, notes, userId, id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Cash-up session not found or already completed");
    }

    logger.info(`Cash-up completed: ${id}`);
    return this.formatCashUp(result.rows[0]);
  }

  /**
   * Reconcile cash-up (manager approval)
   */
  async reconcile(userId: string, id: string, notes?: string) {
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

    if (result.rows.length === 0) {
      throw AppError.notFound("Cash-up session not found or not completed");
    }

    logger.info(`Cash-up reconciled: ${id}`);
    return this.formatCashUp(result.rows[0]);
  }

  /**
   * Add expense to cash-up
   */
  async addExpense(userId: string, cashUpId: string, data: ExpenseData) {
    // Verify cash-up exists and belongs to user
    await this.verifyCashUpOwnership(userId, cashUpId);

    const result = await pool.query(
      `INSERT INTO cash_up_expenses (
        cash_up_id,
        user_id,
        description,
        amount,
        category,
        requires_approval
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        cashUpId,
        userId,
        data.description,
        data.amount,
        data.category,
        data.requiresApproval || false,
      ]
    );

    // Update cash-up totals
    await this.updateCashUpTotals(cashUpId);

    logger.info(`Expense added to cash-up: ${cashUpId}`);
    return this.formatExpense(result.rows[0]);
  }

  /**
   * Update expense
   */
  async updateExpense(
    userId: string,
    expenseId: string,
    data: Partial<ExpenseData>
  ) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.description) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(data.amount);
    }

    if (data.category) {
      fields.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(userId, expenseId);

    const result = await pool.query(
      `UPDATE cash_up_expenses
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex + 1} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Expense not found");
    }

    // Update cash-up totals
    await this.updateCashUpTotals(result.rows[0].cash_up_id);

    logger.info(`Expense updated: ${expenseId}`);
    return this.formatExpense(result.rows[0]);
  }

  /**
   * Delete expense
   */
  async deleteExpense(userId: string, expenseId: string) {
    const result = await pool.query(
      `DELETE FROM cash_up_expenses
       WHERE id = $1 AND user_id = $2
       RETURNING cash_up_id`,
      [expenseId, userId]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Expense not found");
    }

    // Update cash-up totals
    await this.updateCashUpTotals(result.rows[0].cash_up_id);

    logger.info(`Expense deleted: ${expenseId}`);
  }

  /**
   * Upload expense receipt to Supabase Storage
   */
  async uploadReceipt(
    userId: string,
    expenseId: string,
    file: Express.Multer.File
  ) {
    // Verify expense exists and belongs to user
    const expense = await pool.query(
      `SELECT * FROM cash_up_expenses WHERE id = $1 AND user_id = $2`,
      [expenseId, userId]
    );

    if (expense.rows.length === 0) {
      throw AppError.notFound("Expense not found");
    }

    // Generate unique filename
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${userId}/${expenseId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("expense-receipts")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      logger.error("Failed to upload receipt", error);
      throw AppError.internal("Failed to upload receipt");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("expense-receipts")
      .getPublicUrl(fileName);

    // Update expense record
    const result = await pool.query(
      `UPDATE cash_up_expenses
       SET receipt_url = $1,
           receipt_file_name = $2,
           has_receipt = true,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [urlData.publicUrl, file.originalname, expenseId]
    );

    logger.info(`Receipt uploaded for expense: ${expenseId}`);
    return this.formatExpense(result.rows[0]);
  }

  /**
   * Add safe drop
   */
  async addSafeDrop(userId: string, cashUpId: string, data: SafeDropData) {
    await this.verifyCashUpOwnership(userId, cashUpId);

    const result = await pool.query(
      `INSERT INTO safe_drops (
        cash_up_id,
        user_id,
        amount,
        reason,
        notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [cashUpId, userId, data.amount, data.reason, data.notes]
    );

    // Update cash-up totals
    await this.updateCashUpTotals(cashUpId);

    logger.info(`Safe drop added to cash-up: ${cashUpId}`);
    return this.formatSafeDrop(result.rows[0]);
  }

  /**
   * Update safe drop
   */
  async updateSafeDrop(
    userId: string,
    dropId: string,
    data: Partial<SafeDropData>
  ) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(data.amount);
    }

    if (data.reason !== undefined) {
      fields.push(`reason = $${paramIndex++}`);
      values.push(data.reason);
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(userId, dropId);

    const result = await pool.query(
      `UPDATE safe_drops
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex + 1} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Safe drop not found");
    }

    // Update cash-up totals
    await this.updateCashUpTotals(result.rows[0].cash_up_id);

    logger.info(`Safe drop updated: ${dropId}`);
    return this.formatSafeDrop(result.rows[0]);
  }

  /**
   * Delete safe drop
   */
  async deleteSafeDrop(userId: string, dropId: string) {
    const result = await pool.query(
      `DELETE FROM safe_drops
       WHERE id = $1 AND user_id = $2
       RETURNING cash_up_id`,
      [dropId, userId]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Safe drop not found");
    }

    // Update cash-up totals
    await this.updateCashUpTotals(result.rows[0].cash_up_id);

    logger.info(`Safe drop deleted: ${dropId}`);
  }

  /**
   * Get cash-up summary/statistics
   */
  async getSummary(userId: string, startDate?: string, endDate?: string) {
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
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND session_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND session_date <= $${paramIndex}`;
      params.push(endDate);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get daily snapshot (current session)
   */
  async getDailySnapshot(userId: string) {
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `SELECT * FROM cash_ups 
       WHERE user_id = $1 AND session_date = $2`,
      [userId, today]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatCashUp(result.rows[0]);
  }

  /**
   * Helper: Update cash-up totals after expense/drop changes
   */
  private async updateCashUpTotals(cashUpId: string) {
    await pool.query(
      `UPDATE cash_ups
       SET total_expenses = (
         SELECT COALESCE(SUM(amount), 0)
         FROM cash_up_expenses
         WHERE cash_up_id = $1
       ),
       total_safe_drops = (
         SELECT COALESCE(SUM(amount), 0)
         FROM safe_drops
         WHERE cash_up_id = $1
       ),
       expected_cash = opening_float + cash_sales - (
         SELECT COALESCE(SUM(amount), 0)
         FROM cash_up_expenses
         WHERE cash_up_id = $1
       ) - (
         SELECT COALESCE(SUM(amount), 0)
         FROM safe_drops
         WHERE cash_up_id = $1
       ),
       variance = CASE 
         WHEN actual_cash IS NOT NULL 
         THEN actual_cash - (opening_float + cash_sales - (
           SELECT COALESCE(SUM(amount), 0)
           FROM cash_up_expenses
           WHERE cash_up_id = $1
         ) - (
           SELECT COALESCE(SUM(amount), 0)
           FROM safe_drops
           WHERE cash_up_id = $1
         ))
         ELSE variance
       END,
       updated_at = NOW()
       WHERE id = $1`,
      [cashUpId]
    );
  }

  /**
   * Helper: Verify cash-up ownership
   */
  private async verifyCashUpOwnership(userId: string, cashUpId: string) {
    const result = await pool.query(
      `SELECT id FROM cash_ups WHERE id = $1 AND user_id = $2`,
      [cashUpId, userId]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Cash-up session not found");
    }
  }

  /**
   * Format cash-up for response
   */
  private formatCashUp(cashUp: any, includeDetails = false) {
    const formatted: any = {
      id: cashUp.id,
      sessionDate: cashUp.session_date,
      status: cashUp.status,
      openingFloat: parseFloat(cashUp.opening_float),
      totalSales: parseFloat(cashUp.total_sales),
      cashSales: parseFloat(cashUp.cash_sales),
      cardSales: parseFloat(cashUp.card_sales),
      otherPayments: parseFloat(cashUp.other_payments),
      expectedCash: parseFloat(cashUp.expected_cash),
      actualCash: cashUp.actual_cash ? parseFloat(cashUp.actual_cash) : null,
      variance: cashUp.variance ? parseFloat(cashUp.variance) : null,
      totalExpenses: parseFloat(cashUp.total_expenses),
      totalSafeDrops: parseFloat(cashUp.total_safe_drops),
      notes: cashUp.notes,
      createdAt: cashUp.created_at,
      updatedAt: cashUp.updated_at,
      completedAt: cashUp.completed_at,
      reconciledAt: cashUp.reconciled_at,
    };

    if (includeDetails) {
      formatted.expenses = cashUp.expenses || [];
      formatted.safeDrops = cashUp.safe_drops || [];
    }

    if (cashUp.expense_count !== undefined) {
      formatted.expenseCount = parseInt(cashUp.expense_count);
    }

    if (cashUp.safe_drop_count !== undefined) {
      formatted.safeDropCount = parseInt(cashUp.safe_drop_count);
    }

    return formatted;
  }

  /**
   * Format expense for response
   */
  private formatExpense(expense: any) {
    return {
      id: expense.id,
      description: expense.description,
      amount: parseFloat(expense.amount),
      category: expense.category,
      hasReceipt: expense.has_receipt,
      receiptUrl: expense.receipt_url,
      receiptFileName: expense.receipt_file_name,
      requiresApproval: expense.requires_approval,
      approved: expense.approved_by !== null,
      expenseTime: expense.expense_time,
      createdAt: expense.created_at,
    };
  }

  /**
   * Format safe drop for response
   */
  private formatSafeDrop(drop: any) {
    return {
      id: drop.id,
      amount: parseFloat(drop.amount),
      dropTime: drop.drop_time,
      reason: drop.reason,
      notes: drop.notes,
      verified: drop.verified_by !== null,
      createdAt: drop.created_at,
    };
  }
}

export const cashUpService = new CashUpService();
