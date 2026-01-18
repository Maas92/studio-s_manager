import { pool } from "../config/database.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import axios from "axios";

interface CreateClientData {
  name: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  notes?: string;
  date_of_birth?: string;
  address?: string;
  user_id?: string;
}

export class ClientService {
  /**
   * Sync a single client to Google Contacts
   */
  private async syncClientToGoogle(userId: string, clientId: string) {
    try {
      await axios.post(
        `http://google-contacts:5004/google-contacts/sync-client/${clientId}`,
        {},
        {
          headers: {
            "x-gateway-key": process.env.GATEWAY_SECRET || "",
            "x-user-id": userId,
          },
        }
      );

      logger.info({ clientId, userId }, "📇 Client synced to Google Contacts");
    } catch (error: any) {
      logger.error(
        {
          clientId,
          userId,
          error: error.message,
        },
        "❌ Failed to sync client to Google Contacts"
      );
    }
  }

  /**
   * Delete client from Google Contacts
   */
  private async deleteSyncedClient(userId: string, clientId: string) {
    try {
      await axios.delete(
        `http://google-contacts:5004/google-contacts/sync-client/${clientId}`,
        {
          headers: {
            "x-gateway-key": process.env.GATEWAY_SECRET || "",
            "x-user-id": userId,
          },
        }
      );

      logger.info(
        { clientId, userId },
        "🗑️ Client removed from Google Contacts"
      );
    } catch (error: any) {
      logger.error(
        {
          clientId,
          userId,
          error: error.message,
        },
        "❌ Failed to delete client from Google Contacts"
      );
    }
  }

  /**
   * Create new client
   */
  async create(data: CreateClientData, userId: string) {
    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || ".";

    const existingClient = await pool.query(
      "SELECT id FROM clients WHERE phone = $1 AND is_active = true",
      [data.phone]
    );

    if (existingClient.rows.length > 0) {
      throw AppError.conflict("Client with this phone number already exists");
    }

    const result = await pool.query(
      `INSERT INTO clients (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        whatsapp,
        notes,
        date_of_birth,
        address,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,NOW(),NOW())
      RETURNING *`,
      [
        userId,
        firstName,
        lastName,
        data.email || null,
        data.phone,
        data.whatsapp || data.phone,
        data.notes || null,
        data.date_of_birth || null,
        data.address || null,
      ]
    );

    const client = result.rows[0];

    logger.info({ clientId: client.id, userId }, "✅ Client created");

    this.syncClientToGoogle(userId, client.id).catch((err) =>
      logger.error({ err }, "⚠️ Background Google sync failed")
    );

    return this.formatClient(client);
  }

  /**
   * Find all clients
   */
  async findAll(
    userId: string,
    filters: { search?: string; page?: number; limit?: number }
  ) {
    const { search, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let paramIndex = 1;

    let whereClause = `WHERE c.is_active = true`;

    if (search) {
      whereClause += ` AND (
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const dataQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT b.id) AS total_appointments,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') AS completed_appointments,
        COUNT(DISTINCT s.id) AS total_purchases,
        COALESCE(SUM(s.final_amount), 0) AS lifetime_value,
        MAX(b.booking_date) AS last_appointment_date,
        MAX(s.sale_date) AS last_purchase_date
      FROM clients c
      LEFT JOIN bookings b ON c.id = b.client_id
      LEFT JOIN sales s ON c.id = s.client_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.first_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM clients c
      ${whereClause}
    `;

    const countParams = params.slice(0, search ? 1 : 0);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    logger.debug(
      { total: countResult.rows[0].count, page, limit },
      "📊 Clients list fetched"
    );

    return {
      clients: dataResult.rows.map(this.formatClient.bind(this)),
      total: countResult.rows[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    };
  }

  /**
   * Soft delete client
   */
  async delete(userId: string, id: string) {
    const result = await pool.query(
      `UPDATE clients 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    logger.info({ clientId: id, userId }, "🛑 Client deactivated");

    this.deleteSyncedClient(userId, id).catch((err) =>
      logger.error({ err }, "⚠️ Background Google delete failed")
    );
  }

  /**
   * Search clients by query (for autocomplete)
   */
  async search(userId: string, query: string) {
    const result = await pool.query(
      `SELECT 
      c.id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.whatsapp
    FROM clients c
    WHERE c.is_active = true
      AND (
        c.first_name ILIKE $1 OR
        c.last_name ILIKE $1 OR
        c.phone ILIKE $1 OR
        c.email ILIKE $1
      )
    ORDER BY c.first_name ASC
    LIMIT 10`,
      [`%${query}%`]
    );

    logger.debug(
      { count: result.rows.length, query },
      "🔍 Client search executed"
    );

    return result.rows.map(this.formatClient.bind(this));
  }

  /**
   * Find client by ID
   */
  async findById(userId: string, id: string) {
    const result = await pool.query(
      `SELECT 
      c.*,
      COUNT(DISTINCT b.id) AS total_appointments,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') AS completed_appointments,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'cancelled') AS cancelled_appointments,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'no_show') AS no_shows,
      COUNT(DISTINCT s.id) AS total_purchases,
      COALESCE(SUM(s.final_amount), 0) AS lifetime_value,
      MAX(b.booking_date) AS last_appointment_date,
      MAX(s.sale_date) AS last_purchase_date
    FROM clients c
    LEFT JOIN bookings b ON c.id = b.client_id
    LEFT JOIN sales s ON c.id = s.client_id
    WHERE c.id = $1 AND c.is_active = true
    GROUP BY c.id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    logger.debug({ clientId: id }, "📋 Client details fetched");

    return this.formatClient(result.rows[0]);
  }

  /**
   * Update client
   */
  async update(userId: string, id: string, data: Partial<CreateClientData>) {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Handle name update
    if (data.name) {
      const nameParts = data.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || ".";

      updateFields.push(`first_name = $${paramIndex++}`);
      params.push(firstName);
      updateFields.push(`last_name = $${paramIndex++}`);
      params.push(lastName);
    }

    // Handle other fields
    if (data.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      params.push(data.email || null);
    }

    if (data.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      params.push(data.phone);
    }

    if (data.whatsapp !== undefined) {
      updateFields.push(`whatsapp = $${paramIndex++}`);
      params.push(data.whatsapp);
    }

    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      params.push(data.notes || null);
    }

    if (data.date_of_birth !== undefined) {
      updateFields.push(`date_of_birth = $${paramIndex++}`);
      params.push(data.date_of_birth || null);
    }

    if (data.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      params.push(data.address || null);
    }

    if (updateFields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    updateFields.push(`updated_at = NOW()`);

    params.push(id);

    const result = await pool.query(
      `UPDATE clients 
     SET ${updateFields.join(", ")}
     WHERE id = ${paramIndex++} AND is_active = true
     RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    logger.info({ clientId: id, userId }, "✏️ Client updated");

    // Sync to Google Contacts in background
    this.syncClientToGoogle(userId, id).catch((err) =>
      logger.error({ err }, "⚠️ Background Google sync failed")
    );

    return this.formatClient(result.rows[0]);
  }

  /**
   * Get client history (appointments and purchases)
   */
  async getHistory(userId: string, clientId: string) {
    // Verify client exists
    const clientCheck = await pool.query(
      `SELECT id FROM clients WHERE id = $1 AND is_active = true`,
      [clientId]
    );

    if (clientCheck.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    // Get appointments
    const appointmentsResult = await pool.query(
      `SELECT 
      b.id,
      b.booking_date,
      b.start_time,
      b.end_time,
      b.status,
      b.notes,
      b.created_at,
      srv.name AS service_name,
      srv.duration AS service_duration,
      srv.price AS service_price
    FROM bookings b
    LEFT JOIN services srv ON b.service_id = srv.id
    WHERE b.client_id = $1
    ORDER BY b.booking_date DESC, b.start_time DESC
    LIMIT 50`,
      [clientId]
    );

    // Get purchases/sales
    const purchasesResult = await pool.query(
      `SELECT 
      s.id,
      s.sale_date,
      s.subtotal,
      s.discount_amount,
      s.tax_amount,
      s.final_amount,
      s.payment_method,
      s.payment_status,
      s.notes,
      s.created_at,
      json_agg(
        json_build_object(
          'productName', p.name,
          'quantity', si.quantity,
          'unitPrice', si.unit_price,
          'total', si.total_price
        )
      ) AS items
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.client_id = $1
    GROUP BY s.id
    ORDER BY s.sale_date DESC
    LIMIT 50`,
      [clientId]
    );

    logger.debug({ clientId }, "📜 Client history fetched");

    return {
      appointments: appointmentsResult.rows,
      purchases: purchasesResult.rows,
    };
  }

  /**
   * Get client statistics
   */
  async getStats(userId: string, clientId: string) {
    const result = await pool.query(
      `SELECT 
      COUNT(DISTINCT b.id) AS total_appointments,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') AS completed_appointments,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'cancelled') AS cancelled_appointments,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'no_show') AS no_shows,
      COUNT(DISTINCT s.id) AS total_purchases,
      COALESCE(SUM(s.final_amount), 0) AS lifetime_value,
      COALESCE(AVG(s.final_amount), 0) AS average_purchase_value,
      MAX(b.booking_date) AS last_appointment_date,
      MAX(s.sale_date) AS last_purchase_date,
      MIN(b.booking_date) AS first_appointment_date,
      MIN(s.sale_date) AS first_purchase_date
    FROM clients c
    LEFT JOIN bookings b ON c.id = b.client_id
    LEFT JOIN sales s ON c.id = s.client_id
    WHERE c.id = $1 AND c.is_active = true
    GROUP BY c.id`,
      [clientId]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    const stats = result.rows[0];

    logger.debug({ clientId }, "📊 Client stats fetched");

    return {
      totalAppointments: parseInt(stats.total_appointments) || 0,
      completedAppointments: parseInt(stats.completed_appointments) || 0,
      cancelledAppointments: parseInt(stats.cancelled_appointments) || 0,
      noShows: parseInt(stats.no_shows) || 0,
      totalPurchases: parseInt(stats.total_purchases) || 0,
      lifetimeValue: parseFloat(stats.lifetime_value) || 0,
      averagePurchaseValue: parseFloat(stats.average_purchase_value) || 0,
      lastAppointmentDate: stats.last_appointment_date,
      lastPurchaseDate: stats.last_purchase_date,
      firstAppointmentDate: stats.first_appointment_date,
      firstPurchaseDate: stats.first_purchase_date,
    };
  }

  /**
   * Format client for response
   */
  private formatClient(client: any) {
    return {
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
      whatsapp: client.whatsapp,
      notes: client.notes,
      dateOfBirth: client.date_of_birth,
      address: client.address,
      active: client.is_active !== false,
      totalAppointments: parseInt(client.total_appointments) || 0,
      completedAppointments: parseInt(client.completed_appointments) || 0,
      cancelledAppointments: parseInt(client.cancelled_appointments) || 0,
      noShows: parseInt(client.no_shows) || 0,
      totalPurchases: parseInt(client.total_purchases) || 0,
      lifetimeValue: parseFloat(client.lifetime_value) || 0,
      lastAppointmentDate: client.last_appointment_date,
      lastPurchaseDate: client.last_purchase_date,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
    };
  }
}

export const clientService = new ClientService();
