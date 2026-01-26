import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

interface AddCreditData {
  clientId: string;
  amount: number;
  sourceType: "change" | "prepayment" | "refund" | "manual";
  sourceTransactionId?: string;
  notes?: string;
}

interface RedeemCreditData {
  clientId: string;
  amount: number;
  sourceTransactionId?: string;
  notes?: string;
}

export class CreditService {
  /**
   * Get client credit balance
   */
  async getBalance(userId: string, clientId: string): Promise<number> {
    const result = await pool.query(
      `SELECT credit_balance FROM clients 
       WHERE id = $1`,
      [clientId],
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    return parseFloat(result.rows[0].credit_balance) || 0;
  }

  /**
   * Add credit to client account
   */
  async addCredit(userId: string, data: AddCreditData, processedBy?: string) {
    const client = pool;

    try {
      await client.query("BEGIN");

      // Get current balance
      const clientData = await client.query(
        `SELECT credit_balance, lifetime_credits FROM clients 
         WHERE id = $1
         FOR UPDATE`,
        [data.clientId],
      );

      if (clientData.rows.length === 0) {
        throw AppError.notFound("Client not found");
      }

      const balanceBefore = parseFloat(clientData.rows[0].credit_balance) || 0;
      const balanceAfter = balanceBefore + data.amount;

      // Update client balance
      await client.query(
        // TODO add updated by field
        `UPDATE clients 
         SET credit_balance = $1,
             lifetime_credits = lifetime_credits + $2,
             updated_at = NOW()
         WHERE id = $3`,
        [balanceAfter, data.amount, data.clientId],
      );

      // Record transaction
      await client.query(
        `INSERT INTO credit_transactions (
          client_id,
          user_id,
          type,
          amount,
          balance_before,
          balance_after,
          source_type,
          source_transaction_id,
          notes,
          processed_by
        ) VALUES ($1, $2, 'add', $3, $4, $5, $6, $7, $8, $9)`,
        [
          data.clientId,
          userId,
          data.amount,
          balanceBefore,
          balanceAfter,
          data.sourceType,
          data.sourceTransactionId || null,
          data.notes || null,
          processedBy || null,
        ],
      );

      await client.query("COMMIT");

      logger.info(`Credit added: $${data.amount} to client ${data.clientId}`);

      return {
        amount: data.amount,
        balanceBefore,
        balanceAfter,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error({ userId, processedBy, error }, "❌ Failed to add credit:");
      throw error;
    }
  }

  /**
   * Redeem credit from client account
   */
  async redeemCredit(
    userId: string,
    data: RedeemCreditData,
    processedBy?: string,
  ) {
    const client = pool;

    try {
      await client.query("BEGIN");

      // Get current balance
      const clientData = await client.query(
        `SELECT credit_balance FROM clients 
         WHERE id = $1
         FOR UPDATE`,
        [data.clientId],
      );

      if (clientData.rows.length === 0) {
        throw AppError.notFound("Client not found");
      }

      const balanceBefore = parseFloat(clientData.rows[0].credit_balance) || 0;

      if (balanceBefore < data.amount) {
        throw AppError.badRequest(
          `Insufficient credit. Available: $${balanceBefore.toFixed(2)}, Requested: $${data.amount.toFixed(2)}`,
        );
      }

      const balanceAfter = balanceBefore - data.amount;

      // Update client balance
      await client.query(
        `UPDATE clients 
         SET credit_balance = $1,
             lifetime_credits_redeemed = lifetime_credits_redeemed + $2,
             updated_at = NOW()
         WHERE id = $3`,
        [balanceAfter, data.amount, data.clientId],
      );

      // Record transaction
      await client.query(
        `INSERT INTO credit_transactions (
          client_id,
          user_id,
          type,
          amount,
          balance_before,
          balance_after,
          source_type,
          source_transaction_id,
          notes,
          processed_by
        ) VALUES ($1, $2, 'redeem', $3, $4, $5, 'redemption', $6, $7, $8)`,
        [
          data.clientId,
          userId,
          data.amount,
          balanceBefore,
          balanceAfter,
          data.sourceTransactionId || null,
          data.notes || null,
          processedBy || null,
        ],
      );

      await client.query("COMMIT");

      logger.info(
        `Credit redeemed: $${data.amount} from client ${data.clientId}`,
      );

      return {
        amount: data.amount,
        balanceBefore,
        balanceAfter,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(
        { userId, processedBy, error },
        "❌ Failed to redeem credit:",
      );
      throw error;
    }
  }

  /**
   * Get credit history for client
   */
  async getHistory(userId: string, clientId: string, limit = 50) {
    const result = await pool.query(
      `SELECT ct.*, c.first_name, c.last_name
       FROM credit_transactions ct
       JOIN clients c ON ct.client_id = c.id
       WHERE ct.client_id = $1
       ORDER BY ct.created_at DESC
       LIMIT $3`,
      [clientId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      balanceBefore: parseFloat(row.balance_before),
      balanceAfter: parseFloat(row.balance_after),
      sourceType: row.source_type,
      sourceTransactionId: row.source_transaction_id,
      notes: row.notes,
      processedBy: row.processed_by,
      createdAt: row.created_at,
      clientName: `${row.first_name} ${row.last_name}`,
    }));
  }

  /**
   * Get all clients with credit balances (for reports)
   */
  async getClientsWithCredit(userId: string) {
    const result = await pool.query(
      `SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        credit_balance,
        lifetime_credits,
        lifetime_credits_redeemed,
        last_visit_date
       FROM clients
       WHERE credit_balance > 0
       ORDER BY credit_balance DESC`,
      [],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone,
      creditBalance: parseFloat(row.credit_balance),
      lifetimeCredits: parseFloat(row.lifetime_credits),
      lifetimeRedeemed: parseFloat(row.lifetime_credits_redeemed),
      lastVisit: row.last_visit_date,
    }));
  }

  /**
   * Get credit summary for cash-up
   */
  async getCreditSummaryForSession(userId: string, sessionDate: string) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE type = 'add') as credits_added_count,
        COUNT(*) FILTER (WHERE type = 'redeem') as credits_redeemed_count,
        COALESCE(SUM(amount) FILTER (WHERE type = 'add'), 0) as total_credits_added,
        COALESCE(SUM(amount) FILTER (WHERE type = 'redeem'), 0) as total_credits_redeemed
       FROM credit_transactions
       WHERE DATE(created_at) = $2`,
      [sessionDate],
    );

    return {
      creditsAddedCount: parseInt(result.rows[0].credits_added_count),
      creditsRedeemedCount: parseInt(result.rows[0].credits_redeemed_count),
      totalCreditsAdded: parseFloat(result.rows[0].total_credits_added),
      totalCreditsRedeemed: parseFloat(result.rows[0].total_credits_redeemed),
    };
  }

  /**
   * Get credit summary for cash-up
   */

  async getSummary(userId: string, clientId: string) {
    const result = await pool.query(
      `SELECT 
        credit_balance,
        lifetime_credits,
        lifetime_credits_redeemed
       FROM clients
       WHERE id = $1`,
      [clientId],
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }
    return {
      creditBalance: parseFloat(result.rows[0].credit_balance),
      lifetimeCredits: parseFloat(result.rows[0].lifetime_credits),
      lifetimeCreditsRedeemed: parseFloat(
        result.rows[0].lifetime_credits_redeemed,
      ),
    };
  }

  /**
   * Manually set client credit balance
   */
  // TODO add updated by field
  async setCreditBalance(
    userId: string,
    clientId: string,
    newBalance: number,
    notes: string,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE clients
         SET credit_balance = $1
         WHERE id = $2`,
        [newBalance, clientId],
      );

      if (result.rowCount === 0) {
        throw AppError.notFound("Client not found");
      }

      // Log the adjustment
      await client.query(
        `INSERT INTO credit_transactions (
          client_id,
          type,
          amount,
          balance_before,
          balance_after,
          notes,
          processed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clientId,
          "adjust",
          newBalance - (await this.getBalance(userId, clientId)),
          await this.getBalance(userId, clientId),
          newBalance,
          notes,
          userId,
        ],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(
        { userId, processedBy: userId, error },
        "❌ Failed to set credit balance:",
      );
      throw error;
    }
  }
}
export const creditService = new CreditService();
