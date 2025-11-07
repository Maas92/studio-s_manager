import { Response, NextFunction } from "express";
import { pool } from "../config/database.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/apiFeatures.js";
import { UserRequest } from "../middleware/userMiddleware.js";
import { z } from "zod";

const ProductCreate = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category_id: z.string().uuid().nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  cost_cents: z.coerce.number().int().nonnegative(),
  price_cents: z.coerce.number().int().nonnegative(),
  retail: z.boolean().default(false),
  active: z.boolean().default(true),
});
const ProductUpdate = ProductCreate.partial();

const SORT_MAP = {
  name: "p.name",
  sku: "p.sku",
  created_at: "p.created_at",
  updated_at: "p.updated_at",
  price_cents: "p.price_cents",
} as const;

export const getAllProducts = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    let queryText = `
    SELECT 
      p.*,
      c.name as category_name,
      s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
  `;

    const queryParams: any[] = [];

    const features = new APIFeatures(
      queryText,
      queryParams,
      req.query as any,
      SORT_MAP
    )
      .filter()
      .search(["p.name", "p.sku", "p.brand"])
      .buildWhereClause()
      .sort()
      .paginate();

    const result = await pool.query(features.queryText, features.queryParams);
    const countResult = await pool.query("SELECT COUNT(*) FROM products");

    res.status(200).json({
      status: "success",
      results: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: {
        products: result.rows,
      },
    });
  }
);

export const getProduct = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
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
          'quantity_reserved', il.quantity_reserved
        )
      ) FILTER (WHERE il.id IS NOT NULL) as inventory_levels
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN inventory_levels il ON p.id = il.product_id
    LEFT JOIN stock_locations sl ON il.location_id = sl.id
    WHERE p.id = $1
    GROUP BY p.id, c.name, s.name`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return next(new AppError("No product found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        product: result.rows[0],
      },
    });
  }
);

export const createProduct = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const {
      name,
      sku,
      category_id,
      brand,
      supplier_id,
      description,
      unit_of_measure,
      unit_cost,
      retail_price,
      reorder_level,
      expiry_tracking,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products (
      name, sku, category_id, brand, supplier_id, description,
      unit_of_measure, unit_cost, retail_price, reorder_level, expiry_tracking
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
      [
        name,
        sku,
        category_id,
        brand,
        supplier_id,
        description,
        unit_of_measure,
        unit_cost,
        retail_price,
        reorder_level,
        expiry_tracking,
      ]
    );

    res.status(201).json({
      status: "success",
      data: {
        product: result.rows[0],
      },
    });
  }
);

export const updateProduct = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const allowedFields = [
      "name",
      "sku",
      "category_id",
      "brand",
      "supplier_id",
      "description",
      "unit_of_measure",
      "unit_cost",
      "retail_price",
      "reorder_level",
      "expiry_tracking",
      "is_active",
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updates.push(`${key} = ${paramCounter}`);
        values.push(req.body[key]);
        paramCounter++;
      }
    });

    if (updates.length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ${paramCounter}
     RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return next(new AppError("No product found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        product: result.rows[0],
      },
    });
  }
);

export const deleteProduct = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return next(new AppError("No product found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);
