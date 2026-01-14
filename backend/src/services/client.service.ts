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
  user_id?: string; // Add user_id to track who owns the client
}

export class ClientService {
  // Sync a single client to Google Contacts
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
      logger.info(`Client synced to Google: ${clientId}`);
    } catch (error: any) {
      // Log but don't fail the client creation/update
      logger.error("Failed to sync to Google:", {
        clientId,
        userId,
        error: error.message,
      });
    }
  }

  // Delete client from Google Contacts
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
      logger.info(`Client deleted from Google: ${clientId}`);
    } catch (error: any) {
      logger.error("Failed to delete from Google:", {
        clientId,
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Create new client
   */
  async create(data: CreateClientData, userId: string) {
    // Split name into first and last name
    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || ".";

    // Check if client with same phone exists
    const existingClient = await pool.query(
      "SELECT id FROM clients WHERE phone = $1 AND is_active = true",
      [data.phone, userId]
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW()) 
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

    logger.info(`Client created: ${result.rows[0].id}`);

    const client = result.rows[0];

    // Sync to Google in background (non-blocking)
    this.syncClientToGoogle(userId, client.id).catch((err) =>
      logger.error("Background Google sync failed", err)
    );

    return this.formatClient(client);
  }

  /**
   * Find all clients with pagination
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

    return {
      clients: dataResult.rows.map(this.formatClient.bind(this)),
      total: countResult.rows[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    };
  }

  /**
   * Search clients (for quick search/autocomplete)
   */
  async search(userId: string, searchTerm: string) {
    const searchPattern = `%${searchTerm}%`;

    const result = await pool.query(
      `SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        whatsapp
      FROM clients 
      WHERE is_active = true
        AND (
          first_name ILIKE $2 OR 
          last_name ILIKE $2 OR 
          phone ILIKE $2 OR
          email ILIKE $2
        )
      ORDER BY last_name, first_name
      LIMIT 10`,
      [userId, searchPattern]
    );

    return result.rows.map((client: any) => ({
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      email: client.email,
      phone: client.phone,
      whatsapp: client.whatsapp,
    }));
  }

  /**
   * Find client by ID with detailed info
   */
  async findById(userId: string, id: string) {
    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(DISTINCT b.id) as total_appointments,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as completed_appointments,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_appointments,
        COUNT(DISTINCT b.id) FILTER (WHERE b.no_show = true) as no_shows,
        COUNT(DISTINCT s.id) as total_purchases,
        SUM(s.final_amount) as lifetime_value,
        MAX(b.booking_date) as last_appointment_date,
        MAX(s.sale_date) as last_purchase_date
      FROM clients c
      LEFT JOIN bookings b ON c.id = b.client_id
      LEFT JOIN sales s ON c.id = s.client_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    return this.formatClient(result.rows[0]);
  }

  /**
   * Update client
   */
  async update(userId: string, id: string, data: Partial<CreateClientData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Handle name field
    if (data.name) {
      const nameParts = data.name.trim().split(/\s+/);
      fields.push(`first_name = $${paramIndex++}`);
      values.push(nameParts[0]);
      fields.push(`last_name = $${paramIndex++}`);
      values.push(nameParts.slice(1).join(" ") || ".");
    }

    // Handle other fields
    const fieldMap: Record<string, string> = {
      email: "email",
      phone: "phone",
      whatsapp: "whatsapp",
      notes: "notes",
      date_of_birth: "date_of_birth",
      address: "address",
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof CreateClientData] !== undefined) {
        fields.push(`${dbField} = $${paramIndex++}`);
        values.push(data[key as keyof CreateClientData]);
      }
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(userId, id);

    const result = await pool.query(
      `UPDATE clients 
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    logger.info(`Client updated: ${id}`);

    const client = result.rows[0];

    // Sync to Google in background
    this.syncClientToGoogle(userId, client.id).catch((err) =>
      logger.error("Background Google sync failed", err)
    );

    return this.formatClient(client);
  }

  /**
   * Get client history (appointments and purchases)
   */
  async getHistory(userId: string, id: string) {
    // Verify client exists and belongs to user
    const clientCheck = await pool.query(
      "SELECT id FROM clients WHERE id = $1",
      [id, userId]
    );

    if (clientCheck.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    const [appointments, purchases] = await Promise.all([
      // Get appointments from bookings table
      pool.query(
        `SELECT 
          b.id,
          b.booking_date as appointment_date,
          b.start_time,
          b.end_time,
          b.status,
          b.notes,
          s.name as treatment_name,
          s.price as treatment_price,
          s.duration_minutes
        FROM bookings b
        LEFT JOIN services s ON b.treatment_id = s.id
        WHERE b.client_id = $1
        ORDER BY b.booking_date DESC, b.start_time DESC
        LIMIT 50`,
        [id]
      ),

      // Get purchases
      pool.query(
        `SELECT 
          sl.id,
          sl.sale_date,
          sl.final_amount,
          sl.status,
          sl.receipt_number,
          json_agg(
            json_build_object(
              'name', COALESCE(p.name, s.name),
              'quantity', si.quantity,
              'price', si.unit_price,
              'type', CASE 
                WHEN si.product_id IS NOT NULL THEN 'product' 
                ELSE 'treatment' 
              END
            )
          ) as items
        FROM sales sl
        JOIN sale_items si ON sl.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN services s ON si.treatment_id = s.id
        WHERE sl.client_id = $1
        GROUP BY sl.id
        ORDER BY sl.sale_date DESC
        LIMIT 50`,
        [id]
      ),
    ]);

    return {
      appointments: appointments.rows,
      purchases: purchases.rows,
    };
  }

  /**
   * Get client statistics
   */
  async getStats(userId: string, id: string) {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT b.id) as total_appointments,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as completed_appointments,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_appointments,
        COUNT(DISTINCT b.id) FILTER (WHERE b.no_show = true) as no_shows,
        COUNT(DISTINCT s.id) as total_purchases,
        COALESCE(SUM(s.final_amount), 0) as total_spent,
        COALESCE(AVG(s.final_amount), 0) as average_purchase,
        MAX(b.booking_date) as last_visit,
        MIN(b.booking_date) as first_visit,
        array_agg(DISTINCT srv.name) FILTER (WHERE srv.name IS NOT NULL) as favorite_treatments
      FROM clients c
      LEFT JOIN bookings b ON c.id = b.client_id
      LEFT JOIN services srv ON b.treatment_id = srv.id
      LEFT JOIN sales s ON c.id = s.client_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    const stats = result.rows[0];

    return {
      totalAppointments: parseInt(stats.total_appointments) || 0,
      completedAppointments: parseInt(stats.completed_appointments) || 0,
      cancelledAppointments: parseInt(stats.cancelled_appointments) || 0,
      noShows: parseInt(stats.no_shows) || 0,
      totalPurchases: parseInt(stats.total_purchases) || 0,
      totalSpent: parseFloat(stats.total_spent) || 0,
      averagePurchase: parseFloat(stats.average_purchase) || 0,
      lastVisit: stats.last_visit,
      firstVisit: stats.first_visit,
      favoriteTreatments: stats.favorite_treatments || [],
    };
  }

  /**
   * Soft delete client (mark as inactive)
   */
  async delete(userId: string, id: string) {
    const result = await pool.query(
      `UPDATE clients 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    logger.info(`Client deactivated: ${id}`);

    // Delete from Google in background
    this.deleteSyncedClient(userId, id).catch((err) =>
      logger.error("Background Google delete failed", err)
    );
  }

  /**
   * Format client object for response
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
