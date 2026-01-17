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
    const existing = await pool.query(
      `SELECT id FROM cash_ups 
       WHERE user_id = $1 AND session_date = $2`,
      [userId, data.sessionDate]
    );

    if (existing.rows.length > 0) {
      throw AppError.conflict("Cash-up session already exists for this date");
    }

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
        data.openingFloat + transactions.cashSales,
      ]
    );

    logger.info(
      {
        cashUpId: result.rows[0].id,
        userId,
        sessionDate: data.sessionDate,
      },
      "💰 Cash-up session created"
    );

    return this.formatCashUp(result.rows[0]);
  }

  /**
   * Get transactions for a specific date
   */
  private async getTransactionsForDate(userId: string, date: string) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as transaction_count,
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(SUM(
            CASE 
              WHEN payments IS NOT NULL THEN 
                (SELECT COALESCE(SUM((p->>'amount')::numeric), 0) 
                 FROM jsonb_array_elements(payments) AS p 
                 WHERE p->>'method' = 'cash')
              ELSE 0
            END
          ), 0) as cash_sales,
          COALESCE(SUM(
            CASE 
              WHEN payments IS NOT NULL THEN 
                (SELECT COALESCE(SUM((p->>'amount')::numeric), 0) 
                 FROM jsonb_array_elements(payments) AS p 
                 WHERE p->>'method' = 'card')
              ELSE 0
            END
          ), 0) as card_sales,
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
      logger.warn(
        {
          userId,
          date,
          error: error.message,
        },
        "⚠️ Failed to query transactions, using default values"
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
   * Find all cash-up sessions
   */
  async findAll(userId: string, filters: any) {
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

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(`SELECT COUNT(*) FROM cash_ups WHERE user_id = $1`, [userId]),
    ]);

    return {
      cashUps: dataResult.rows.map((row) => this.formatCashUp(row, false)),
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Upload expense receipt
   */
  async uploadReceipt(
    userId: string,
    expenseId: string,
    file: Express.Multer.File
  ) {
    const expense = await pool.query(
      `SELECT * FROM cash_up_expenses WHERE id = $1 AND user_id = $2`,
      [expenseId, userId]
    );

    if (expense.rows.length === 0) {
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
      logger.error(
        {
          userId,
          expenseId,
          error,
        },
        "❌ Failed to upload receipt"
      );
      throw AppError.internal("Failed to upload receipt");
    }

    const { data: urlData } = supabase.storage
      .from("expense-receipts")
      .getPublicUrl(fileName);

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

    logger.info(
      {
        expenseId,
        userId,
      },
      "📎 Receipt uploaded successfully"
    );

    return this.formatExpense(result.rows[0]);
  }

  /* =====================
     Formatting helpers
     ===================== */

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

    return formatted;
  }

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
