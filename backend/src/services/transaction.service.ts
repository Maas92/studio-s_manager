import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

// ============================================================================
// TAX CONFIGURATION
// ============================================================================
const TAX_CONFIG = {
  rate: 0.15, // 15% - change to 0.155 for 15.5%
  inclusive: true, // Tax is included in prices

  // Calculate tax from tax-inclusive price
  extractTax(amount: number): number {
    return amount * (this.rate / (1 + this.rate));
  },

  // Get the base amount (before tax) from tax-inclusive price
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
  /**
   * Find all transactions with filtering
   */
  async findAll(filters: {
    clientId?: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      clientId,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
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
   * Create new transaction with tax-inclusive pricing
   */
  async create(data: CreateTransactionData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Calculate subtotal (already tax-inclusive from cart prices)
      const subtotal = data.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // 2. Calculate discount amount
      let discountAmount = 0;
      if (data.discount.type === "percentage") {
        discountAmount = (subtotal * data.discount.value) / 100;
      } else if (data.discount.type === "fixed") {
        discountAmount = data.discount.value;
      }
      discountAmount = Math.min(discountAmount, subtotal);

      // 3. Calculate loyalty value
      const loyaltyValue = data.loyaltyPointsRedeemed
        ? data.loyaltyPointsRedeemed * 0.01
        : 0;

      // 4. Total after discounts (still tax-inclusive)
      const afterDiscount = Math.max(
        0,
        subtotal - discountAmount - loyaltyValue
      );

      // 5. Extract tax from the tax-inclusive amount
      const tax = TAX_CONFIG.extractTax(afterDiscount);

      // 6. Calculate tips
      const tipsTotal = data.tips
        ? Object.values(data.tips).reduce((sum, tip) => sum + tip, 0)
        : 0;

      // 7. Final total = tax-inclusive amount + tips
      const total = afterDiscount + tipsTotal;

      // 8. Calculate loyalty points earned (based on final total)
      const loyaltyPointsEarned = Math.floor(total * 10); // $1 = 10 points

      // 9. Determine payment method
      const paymentMethod =
        data.payments.length === 1 ? data.payments[0].method : "split";

      // 10. Determine payment status
      const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      let paymentStatus = "pending";
      if (totalPaid >= total) {
        paymentStatus = "paid";
      } else if (totalPaid > 0) {
        paymentStatus = "partial";
      }

      // 11. Build notes
      let notes = data.notes || "";
      if (!data.clientId && data.clientName) {
        notes = notes
          ? `Walk-in: ${data.clientName}. ${notes}`
          : `Walk-in: ${data.clientName}`;
      }

      // 12. Insert transaction
      const transactionResult = await client.query(
        `INSERT INTO transactions (
          client_id, client_name, items, subtotal, discount, discount_amount,
          loyalty_value, loyalty_points_earned, loyalty_points_redeemed,
          tax, tax_rate, tax_inclusive, tips, tips_total, total,
          payments, payment_method, payment_status, status, notes,
          completed_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22
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
          paymentStatus === "paid" ? "completed" : "pending",
          notes,
          paymentStatus === "paid" ? new Date() : null,
          data.createdBy,
        ]
      );

      const transaction = transactionResult.rows[0];

      // 13. Insert transaction items (normalized for reporting)
      for (const item of data.items) {
        await client.query(
          `INSERT INTO transaction_items (
            transaction_id, item_type, product_id, treatment_id, appointment_id,
            item_name, quantity, unit_price, discount_amount, subtotal,
            staff_id, staff_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            transaction.id,
            item.type,
            item.productId || null,
            item.treatmentId || null,
            item.appointmentId || null,
            item.name,
            item.quantity,
            item.price,
            item.discount || 0,
            item.price * item.quantity,
            item.staffId || null,
            item.staffName || null,
          ]
        );

        // 14. Update inventory for products
        if (item.type === "product" && item.productId) {
          await client.query(
            `UPDATE inventory_levels 
             SET quantity_available = quantity_available - $1,
                 updated_at = NOW()
             WHERE product_id = $2`,
            [item.quantity, item.productId]
          );
        }
      }

      // 15. Update client loyalty points if applicable
      if (data.clientId) {
        const pointsChange =
          loyaltyPointsEarned - (data.loyaltyPointsRedeemed || 0);

        await client.query(
          `UPDATE clients 
           SET loyalty_points = GREATEST(0, loyalty_points + $1),
               updated_at = NOW()
           WHERE id = $2`,
          [pointsChange, data.clientId]
        );
      }

      await client.query("COMMIT");

      logger.info(`Transaction created: ${transaction.id}`);
      return transaction;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to create transaction:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update transaction status
   */
  async updateStatus(id: string, status: string) {
    const result = await pool.query(
      `UPDATE transactions
       SET status = $1, 
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Transaction not found");
    }

    logger.info(`Transaction status updated: ${id} -> ${status}`);
    return result.rows[0];
  }

  /**
   * Get transaction summary/stats
   */
  async getStats(filters: { dateFrom?: string; dateTo?: string }) {
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
      `SELECT 
        COUNT(*) as total_transactions,
        SUM(total) as total_revenue,
        AVG(total) as avg_transaction,
        SUM(tips_total) as total_tips,
        SUM(tax) as total_tax,
        COUNT(DISTINCT client_id) as unique_clients
       FROM transactions
       WHERE ${whereClause}`,
      params
    );

    return result.rows[0];
  }
}

export const transactionService = new TransactionService();
