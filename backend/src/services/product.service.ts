import { pool } from "../config/database.js";
import { Product } from "../types/index.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

export class ProductService {
  /**
   * Find all products with optional filtering
   */
  async findAll(filters: {
    category_id?: string;
    supplier_id?: string;
    active?: boolean;
    retail?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    try {
      const {
        category_id,
        supplier_id,
        active,
        retail,
        search,
        page = 1,
        limit = 50,
        sort = "created_at",
      } = filters;

      const params: any[] = [];
      let paramIndex = 1;
      const conditions: string[] = [];

      // Build WHERE conditions
      if (category_id) {
        conditions.push(`p.category_id = $${paramIndex++}`);
        params.push(category_id);
      }

      if (supplier_id) {
        conditions.push(`p.supplier_id = $${paramIndex++}`);
        params.push(supplier_id);
      }

      if (active !== undefined) {
        conditions.push(`p.active = $${paramIndex++}`);
        params.push(active);
      }

      if (retail !== undefined) {
        conditions.push(`p.retail = $${paramIndex++}`);
        params.push(retail);
      }

      if (search) {
        conditions.push(
          `(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`
        );
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Build ORDER BY clause
      const sortMap: Record<string, string> = {
        name: "p.name",
        sku: "p.sku",
        created_at: "p.created_at",
        updated_at: "p.updated_at",
        price_cents: "p.price_cents",
        cost_cents: "p.cost_cents",
      };

      const sortDirection = sort.startsWith("-") ? "DESC" : "ASC";
      const sortField = sort.replace(/^-/, "");
      const orderBy = sortMap[sortField] || "p.created_at";

      // Pagination
      const offset = (page - 1) * limit;
      params.push(limit, offset);

      const query = `
        SELECT 
          p.*,
          c.name as category_name,
          s.name as supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ${whereClause}
        ORDER BY ${orderBy} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(
          `SELECT COUNT(*) FROM products p ${whereClause}`,
          params.slice(0, -2)
        ),
      ]);

      return {
        products: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      };
    } catch (error) {
      logger.error("Error in ProductService.findAll:", error);
      throw error;
    }
  }

  /**
   * Find a product by ID with inventory details
   */
  async findById(id: string) {
    try {
      const result = await pool.query(
        `SELECT 
          p.*,
          c.name as category_name,
          s.name as supplier_name,
          json_agg(
            json_build_object(
              'location_id', il.location_id,
              'location_name', sl.name,
              'quantity_available', il.quantity_available,
              'quantity_reserved', il.quantity_reserved,
              'quantity_free', (il.quantity_available - il.quantity_reserved),
              'batch_number', il.batch_number,
              'expiry_date', il.expiry_date
            )
          ) FILTER (WHERE il.id IS NOT NULL) as inventory_levels
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN inventory_levels il ON p.id = il.product_id
        LEFT JOIN stock_locations sl ON il.location_id = sl.id
        WHERE p.id = $1
        GROUP BY p.id, c.name, s.name`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError("Product not found", 404);
      }

      return result.rows[0];
    } catch (error) {
      logger.error("Error in ProductService.findById:", error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async create(data: {
    sku: string;
    name: string;
    category_id?: string | null;
    supplier_id?: string | null;
    cost_cents: number;
    price_cents: number;
    retail?: boolean;
    active?: boolean;
  }) {
    try {
      const result = await pool.query(
        `INSERT INTO products 
        (sku, name, category_id, supplier_id, cost_cents, price_cents, retail, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          data.sku,
          data.name,
          data.category_id ?? null,
          data.supplier_id ?? null,
          data.cost_cents,
          data.price_cents,
          data.retail ?? false,
          data.active ?? true,
        ]
      );

      logger.info(`Product created: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === "23505") {
        throw new AppError("A product with this SKU already exists", 409);
      }
      logger.error("Error in ProductService.create:", error);
      throw error;
    }
  }

  /**
   * Update a product
   */
  async update(id: string, data: Partial<Product>) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build SET clause dynamically
      const updateFields: Array<{ key: keyof Product; dbColumn: string }> = [
        { key: "sku", dbColumn: "sku" },
        { key: "name", dbColumn: "name" },
        { key: "category_id", dbColumn: "category_id" },
        { key: "supplier_id", dbColumn: "supplier_id" },
        { key: "cost_cents", dbColumn: "cost_cents" },
        { key: "price_cents", dbColumn: "price_cents" },
        { key: "retail", dbColumn: "retail" },
        { key: "active", dbColumn: "active" },
      ];

      for (const { key, dbColumn } of updateFields) {
        if (data[key] !== undefined) {
          fields.push(`${dbColumn} = $${paramIndex++}`);
          values.push(data[key]);
        }
      }

      if (fields.length === 0) {
        throw new AppError("No fields to update", 400);
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE products 
        SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new AppError("Product not found", 404);
      }

      logger.info(`Product updated: ${id}`);
      return result.rows[0];
    } catch (error) {
      logger.error("Error in ProductService.update:", error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async delete(id: string) {
    try {
      const result = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError("Product not found", 404);
      }

      logger.info(`Product deleted: ${id}`);
      return true;
    } catch (error: any) {
      if (error.code === "23503") {
        throw new AppError(
          "Cannot delete product as it has associated inventory records",
          400
        );
      }
      logger.error("Error in ProductService.delete:", error);
      throw error;
    }
  }
}

export const productService = new ProductService();
