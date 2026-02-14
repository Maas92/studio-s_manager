import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

// ============================================================================
// TAX CONFIGURATION
// ============================================================================
const TAX_CONFIG = {
  rate: 0.15,
  inclusive: true,

  extractTax(amount: number): number {
    return amount * (this.rate / (1 + this.rate));
  },

  getBaseAmount(amount: number): number {
    return amount / (1 + this.rate);
  },
};

// ============================================================================
// INTERFACES
// ============================================================================
interface CartItem {
  id: string;
  type: "product" | "treatment" | "appointment";
  name: string;
  price: number;
  quantity: number;
  productId?: string;
  treatmentId?: string;
  appointmentId?: string;
  staffId?: string;
  staffName?: string;
  discount?: number;
}

interface Discount {
  type: "percentage" | "fixed" | "none";
  value: number;
  reason?: string;
}

interface Payment {
  method: string;
  amount: number;
  reference?: string;
}

interface CreateTransactionData {
  clientId?: string;
  clientName?: string;
  items: CartItem[];
  discount: Discount;
  payments: Payment[];
  tips?: Record<string, number>;
  loyaltyPointsRedeemed?: number;
  createdBy: string;
  notes?: string;
}

// ============================================================================
// TRANSACTION SERVICE
// ============================================================================
export class TransactionService {
  async findAll(filters: {
    clientId?: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        clientId,
        status,
        paymentStatus,
        dateFrom,
        dateTo,
        page = 1,
        limit = 5000,
      } = filters;

      const offset = (page - 1) * limit;
      const params: any[] = [];
      let paramIndex = 1;
      const conditions: string[] = [];

      if (clientId) {
        conditions.push(`client_id = $${paramIndex++}`);
        params.push(clientId);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (paymentStatus) {
        conditions.push(`payment_status = $${paramIndex++}`);
        params.push(paymentStatus);
      }

      if (dateFrom) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(dateFrom);
      }

      if (dateTo) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(dateTo);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      params.push(limit, offset);

      const [dataResult, countResult] = await Promise.all([
        pool.query(
          `
          SELECT * FROM transactions
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
          params,
        ),
        pool.query(
          `SELECT COUNT(*) FROM transactions ${whereClause}`,
          params.slice(0, -2),
        ),
      ]);

      return {
        transactions: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      };
    } catch (error) {
      logger.error(
        { err: error, filters },
        "❌ TransactionService.findAll failed",
      );
      throw error;
    }
  }

  async findById(id: string) {
    try {
      const result = await pool.query(
        "SELECT * FROM transactions WHERE id = $1",
        [id],
      );

      if (result.rows.length === 0) {
        throw AppError.notFound("Transaction not found");
      }

      return result.rows[0];
    } catch (error) {
      logger.error(
        { err: error, transactionId: id },
        "❌ TransactionService.findById failed",
      );
      throw error;
    }
  }

  async create(data: CreateTransactionData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const subtotal = data.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      let discountAmount = 0;
      if (data.discount.type === "percentage") {
        discountAmount = (subtotal * data.discount.value) / 100;
      } else if (data.discount.type === "fixed") {
        discountAmount = data.discount.value;
      }
      discountAmount = Math.min(discountAmount, subtotal);

      const loyaltyValue = data.loyaltyPointsRedeemed
        ? data.loyaltyPointsRedeemed * 0.01
        : 0;

      const afterDiscount = Math.max(
        0,
        subtotal - discountAmount - loyaltyValue,
      );

      const tax = TAX_CONFIG.extractTax(afterDiscount);

      const tipsTotal = data.tips
        ? Object.values(data.tips).reduce((sum, tip) => sum + tip, 0)
        : 0;

      const total = afterDiscount + tipsTotal;

      const loyaltyPointsEarned = Math.floor(total * 10);

      const paymentMethod =
        data.payments.length === 1 ? data.payments[0].method : "split";

      const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      let paymentStatus = "pending";
      if (totalPaid >= total) paymentStatus = "paid";
      else if (totalPaid > 0) paymentStatus = "partial";

      let notes = data.notes || "";
      if (!data.clientId && data.clientName) {
        notes = notes
          ? `Walk-in: ${data.clientName}. ${notes}`
          : `Walk-in: ${data.clientName}`;
      }

      const transactionResult = await client.query(
        `INSERT INTO transactions (
          client_id,
          client_name,
          items,
          subtotal,
          discount,
          discount_amount,
          loyalty_value,
          loyalty_points_earned,
          loyalty_points_redeemed,
          tax,
          tax_rate,
          tax_inclusive,
          tips,
          tips_total,
          total,
          payments,
          payment_method,
          payment_status,
          status,
          notes,
          created_by,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, NOW()
        ) RETURNING *`,
        [
          data.clientId || null,
          data.clientName || null,
          JSON.stringify(data.items),
          subtotal,
          JSON.stringify(data.discount),
          discountAmount,
          loyaltyValue,
          loyaltyPointsEarned,
          data.loyaltyPointsRedeemed || 0,
          tax,
          TAX_CONFIG.rate,
          TAX_CONFIG.inclusive,
          JSON.stringify(data.tips || {}),
          tipsTotal,
          total,
          JSON.stringify(data.payments),
          paymentMethod,
          paymentStatus,
          "completed",
          notes,
          null, // created_by - set to null since auth uses MongoDB
        ],
      );

      const transaction = transactionResult.rows[0];

      // Convert string numbers to actual numbers for frontend
      const formattedTransaction = {
        ...transaction,
        subtotal: parseFloat(transaction.subtotal),
        discount_amount: parseFloat(transaction.discount_amount),
        loyalty_value: parseFloat(transaction.loyalty_value),
        tax: parseFloat(transaction.tax),
        tax_rate: parseFloat(transaction.tax_rate),
        tips_total: parseFloat(transaction.tips_total),
        total: parseFloat(transaction.total),
      };

      await client.query("COMMIT");

      logger.info(
        {
          transactionId: formattedTransaction.id,
          total: formattedTransaction.total,
        },
        "✅ Transaction created",
      );

      return formattedTransaction;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(
        { err: error, clientId: data.clientId },
        "❌ Failed to create transaction",
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      const result = await pool.query(
        `UPDATE transactions
         SET status = $1,
             completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, id],
      );

      if (result.rows.length === 0) {
        throw AppError.notFound("Transaction not found");
      }

      logger.info(
        { transactionId: id, status },
        "🔄 Transaction status updated",
      );

      return result.rows[0];
    } catch (error) {
      logger.error(
        { err: error, transactionId: id, status },
        "❌ TransactionService.updateStatus failed",
      );
      throw error;
    }
  }

  async getStats(filters: { dateFrom?: string; dateTo?: string }) {
    try {
      const { dateFrom, dateTo } = filters;

      const params: any[] = [];
      let paramIndex = 1;
      const conditions: string[] = ["status = 'completed'"];

      if (dateFrom) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(dateFrom);
      }

      if (dateTo) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(dateTo);
      }

      const whereClause = conditions.join(" AND ");

      const result = await pool.query(
        `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(total) as total_revenue,
          AVG(total) as avg_transaction,
          SUM(tips_total) as total_tips,
          SUM(tax) as total_tax,
          COUNT(DISTINCT client_id) as unique_clients
        FROM transactions
        WHERE ${whereClause}
        `,
        params,
      );

      return result.rows[0];
    } catch (error) {
      logger.error(
        { err: error, filters },
        "❌ TransactionService.getStats failed",
      );
      throw error;
    }
  }
}

export const transactionService = new TransactionService();
