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
