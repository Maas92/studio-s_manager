import { pool } from "../config/database";
import AppError from "../utils/appError";
import { logger } from "../utils/logger";

interface CreateClientData {
  name: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  notes?: string;
  date_of_birth?: string;
  address?: string;
}

export class ClientService {
  /**
   * Create new client
   */
  async create(data: CreateClientData) {
    // Split name into first and last name
    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || ".";

    // Check if client with same phone exists
    const existingClient = await pool.query(
      "SELECT id FROM clients WHERE phone = $1 AND active = true",
      [data.phone]
    );

    if (existingClient.rows.length > 0) {
      throw AppError.conflict("Client with this phone number already exists");
    }

    const result = await pool.query(
      `INSERT INTO clients (
        first_name, 
        last_name, 
        email, 
        phone, 
        whatsapp,
        notes,
        date_of_birth,
        address,
        active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW()) 
      RETURNING *`,
      [
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
    return this.formatClient(result.rows[0]);
  }

  /**
   * Find all clients with pagination
   */
  async findAll(filters: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT a.id) as total_appointments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
        COUNT(DISTINCT s.id) as total_purchases,
        SUM(s.final_amount) as lifetime_value,
        MAX(a.appointment_date) as last_appointment_date,
        MAX(s.sale_date) as last_purchase_date
      FROM clients c
      LEFT JOIN appointments a ON c.id = a.client_id
      LEFT JOIN sales s ON c.id = s.client_id
      WHERE c.active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (
        c.first_name ILIKE $${paramIndex} OR 
        c.last_name ILIKE $${paramIndex} OR 
        c.phone ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Count query
    let countQuery = `SELECT COUNT(*) FROM clients WHERE active = true`;
    const countParams: any[] = [];

    if (search) {
      countQuery += ` AND (
        first_name ILIKE $1 OR 
        last_name ILIKE $1 OR 
        phone ILIKE $1 OR 
        email ILIKE $1
      )`;
      countParams.push(`%${search}%`);
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return {
      clients: dataResult.rows.map(this.formatClient),
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Search clients (for quick search/autocomplete)
   */
  async search(searchTerm: string) {
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
      WHERE active = true
        AND (
          first_name ILIKE $1 OR 
          last_name ILIKE $1 OR 
          phone ILIKE $1 OR
          email ILIKE $1
        )
      ORDER BY last_name, first_name
      LIMIT 10`,
      [searchPattern]
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
  async findById(id: string) {
    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(DISTINCT a.id) as total_appointments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'no_show') as no_shows,
        COUNT(DISTINCT s.id) as total_purchases,
        SUM(s.final_amount) as lifetime_value,
        MAX(a.appointment_date) as last_appointment_date,
        MAX(s.sale_date) as last_purchase_date
      FROM clients c
      LEFT JOIN appointments a ON c.id = a.client_id
      LEFT JOIN sales s ON c.id = s.client_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    return this.formatClient(result.rows[0]);
  }

  /**
   * Update client
   */
  async update(id: string, data: Partial<CreateClientData>) {
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

    values.push(id);

    const result = await pool.query(
      `UPDATE clients 
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    logger.info(`Client updated: ${id}`);
    return this.formatClient(result.rows[0]);
  }

  /**
   * Get client history (appointments and purchases)
   */
  async getHistory(id: string) {
    // Verify client exists
    const clientCheck = await pool.query(
      "SELECT id FROM clients WHERE id = $1",
      [id]
    );

    if (clientCheck.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    const [appointments, purchases] = await Promise.all([
      // Get appointments
      pool.query(
        `SELECT 
          a.id,
          a.appointment_date,
          a.start_time,
          a.end_time,
          a.status,
          a.notes,
          t.name as treatment_name,
          t.price as treatment_price,
          t.duration_minutes
        FROM appointments a
        LEFT JOIN treatments t ON a.treatment_id = t.id
        WHERE a.client_id = $1
        ORDER BY a.appointment_date DESC, a.start_time DESC
        LIMIT 50`,
        [id]
      ),

      // Get purchases
      pool.query(
        `SELECT 
          s.id,
          s.sale_date,
          s.final_amount,
          s.status,
          s.receipt_number,
          json_agg(
            json_build_object(
              'name', COALESCE(p.name, t.name),
              'quantity', si.quantity,
              'price', si.unit_price,
              'type', CASE 
                WHEN si.product_id IS NOT NULL THEN 'product' 
                ELSE 'treatment' 
              END
            )
          ) as items
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN treatments t ON si.service_id = t.id
        WHERE s.client_id = $1
        GROUP BY s.id
        ORDER BY s.sale_date DESC
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
  async getStats(id: string) {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT a.id) as total_appointments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'no_show') as no_shows,
        COUNT(DISTINCT s.id) as total_purchases,
        COALESCE(SUM(s.final_amount), 0) as total_spent,
        COALESCE(AVG(s.final_amount), 0) as average_purchase,
        MAX(a.appointment_date) as last_visit,
        MIN(a.appointment_date) as first_visit,
        array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as favorite_treatments
      FROM clients c
      LEFT JOIN appointments a ON c.id = a.client_id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      LEFT JOIN sales s ON c.id = s.client_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id]
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
  async delete(id: string) {
    const result = await pool.query(
      `UPDATE clients 
       SET active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Client not found");
    }

    logger.info(`Client deactivated: ${id}`);
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
      active: client.active !== false,
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
