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
    const parsed = ProductCreate.parse(req.body);

    const result = await pool.query(
      `INSERT INTO public.products
      (sku, name, category_id, supplier_id, cost_cents, price_cents, retail, active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
      [
        //   name,
        //   parsed.sku,
        //   parsed.category_id,
        //   parsed.brand,
        //   parsed.supplier_id,
        //   parsed.description,
        //   parsed.unit_of_measure,
        //   parsed.unit_cost,
        //   parsed.retail_price,
        //   parsed.reorder_level,
        //   parsed.expiry_tracking,
        parsed.sku,
        parsed.name,
        parsed.category_id ?? null,
        parsed.supplier_id ?? null,
        parsed.cost_cents,
        parsed.price_cents,
        parsed.retail,
        parsed.active,
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
    const parsed = ProductUpdate.parse(req.body);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const assign = (k: string, v: any) => {
      if (v === undefined) return;
      fields.push(`${k} = $${idx++}`);
      values.push(v);
    };

    assign("sku", parsed.sku);
    assign("name", parsed.name);
    assign("category_id", parsed.category_id ?? null);
    assign("supplier_id", parsed.supplier_id ?? null);
    assign("cost_cents", parsed.cost_cents);
    assign("price_cents", parsed.price_cents);
    assign("retail", parsed.retail);
    assign("active", parsed.active);

    if (fields.length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE products SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ${idx}
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
