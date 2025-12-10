import { pool } from '../config/database.js';
import AppError from '../utils/appError.js';
import { logger } from '../utils/logger.js';

type StockLocation = "retail" | "treatment" | "storage";

interface CreateStockItemData {
  name: string;
  sku?: string;
  category?: string;
  location: StockLocation;
  quantity: number;
  min_quantity?: number;
  unit?: string;
  cost?: number;
  retail_price?: number;
  supplier?: string;
  notes?: string;
}

interface TransferStockData {
  item_id: string;
  from_location: StockLocation;
  to_location: StockLocation;
  quantity: number;
  notes?: string;
}

export class StockService {
  /**
   * Find all stock items
   */
  async findAll(filters: {
    location?: StockLocation;
    category?: string;
    low_stock?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      location,
      category,
      low_stock,
      search,
      page = 1,
      limit = 50,
    } = filters;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (location) {
      conditions.push(`location = $${paramIndex++}`);
      params.push(location);
    }

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (low_stock) {
      conditions.push(`quantity <= min_quantity`);
    }

    if (search) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit, offset);

    const query = `
      SELECT * FROM stock_items
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM stock_items ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    return {
      items: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  /**
   * Find stock item by ID
   */
  async findById(id: string) {
    const result = await pool.query("SELECT * FROM stock_items WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      throw AppError.notFound("Stock item not found");
    }

    return result.rows[0];
  }

  /**
   * Create new stock item
   */
  async create(data: CreateStockItemData) {
    const result = await pool.query(
      `INSERT INTO stock_items (
        name, sku, category, location, quantity, min_quantity,
        unit, cost, retail_price, supplier, notes, last_restocked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        data.name,
        data.sku || null,
        data.category || null,
        data.location,
        data.quantity,
        data.min_quantity || 0,
        data.unit || null,
        data.cost || null,
        data.retail_price || null,
        data.supplier || null,
        data.notes || null,
      ]
    );

    logger.info(`Stock item created: ${result.rows[0].id}`);
    return result.rows[0];
  }

  /**
   * Update stock item
   */
  async update(id: string, data: Partial<CreateStockItemData>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: "name",
      sku: "sku",
      category: "category",
      location: "location",
      quantity: "quantity",
      min_quantity: "min_quantity",
      unit: "unit",
      cost: "cost",
      retail_price: "retail_price",
      supplier: "supplier",
      notes: "notes",
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof CreateStockItemData] !== undefined) {
        fields.push(`${dbField} = $${paramIndex++}`);
        values.push(data[key as keyof CreateStockItemData]);
      }
    }

    if (fields.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE stock_items
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Stock item not found");
    }

    logger.info(`Stock item updated: ${id}`);
    return result.rows[0];
  }

  /**
   * Transfer stock between locations
   */
  async transfer(data: TransferStockData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if item exists at source location
      const sourceCheck = await client.query(
        "SELECT quantity FROM stock_items WHERE id = $1 AND location = $2",
        [data.item_id, data.from_location]
      );

      if (sourceCheck.rows.length === 0) {
        throw AppError.notFound("Item not found at source location");
      }

      if (sourceCheck.rows[0].quantity < data.quantity) {
        throw AppError.badRequest("Insufficient quantity at source location");
      }

      // Decrease quantity at source
      await client.query(
        "UPDATE stock_items SET quantity = quantity - $1 WHERE id = $2 AND location = $3",
        [data.quantity, data.item_id, data.from_location]
      );

      // Check if item exists at destination
      const destCheck = await client.query(
        "SELECT id FROM stock_items WHERE id = $1 AND location = $2",
        [data.item_id, data.to_location]
      );

      if (destCheck.rows.length > 0) {
        // Increase quantity at destination
        await client.query(
          "UPDATE stock_items SET quantity = quantity + $1 WHERE id = $2 AND location = $3",
          [data.quantity, data.item_id, data.to_location]
        );
      } else {
        // Create new entry at destination (would need item details)
        throw AppError.badRequest("Destination location entry does not exist");
      }

      // Log the transfer
      await client.query(
        `INSERT INTO stock_transfers (
          item_id, from_location, to_location, quantity, notes, transferred_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          data.item_id,
          data.from_location,
          data.to_location,
          data.quantity,
          data.notes || null,
        ]
      );

      await client.query("COMMIT");
      logger.info(
        `Stock transferred: ${data.item_id} from ${data.from_location} to ${data.to_location}`
      );

      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete stock item
   */
  async delete(id: string) {
    const result = await pool.query(
      "DELETE FROM stock_items WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      throw AppError.notFound("Stock item not found");
    }

    logger.info(`Stock item deleted: ${id}`);
  }
}

export const stockService = new StockService();
