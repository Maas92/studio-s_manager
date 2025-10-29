import { Response, NextFunction } from "express";
import { pool } from "../config/database.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { UserRequest } from "../middleware/userMiddleware.js";
import { PoolClient } from "pg";

export const getInventoryLevels = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const { location_id, product_id, low_stock } = req.query;

    let queryText = `
    SELECT 
      il.*,
      p.name as product_name,
      p.sku,
      p.reorder_level,
      sl.name as location_name,
      sl.type as location_type,
      (il.quantity_available - il.quantity_reserved) as quantity_free
    FROM inventory_levels il
    JOIN products p ON il.product_id = p.id
    JOIN stock_locations sl ON il.location_id = sl.id
    WHERE 1=1
  `;

    const params: any[] = [];
    let paramCounter = 1;

    if (location_id) {
      queryText += ` AND il.location_id = ${paramCounter}`;
      params.push(location_id);
      paramCounter++;
    }

    if (product_id) {
      queryText += ` AND il.product_id = ${paramCounter}`;
      params.push(product_id);
      paramCounter++;
    }

    if (low_stock === "true") {
      queryText += ` AND il.quantity_available <= p.reorder_level`;
    }

    queryText += " ORDER BY p.name, sl.name";

    const result = await pool.query(queryText, params);

    res.status(200).json({
      status: "success",
      results: result.rows.length,
      data: {
        inventoryLevels: result.rows,
      },
    });
  }
);

export const adjustInventory = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const {
      product_id,
      location_id,
      quantity_change,
      reason,
      batch_number,
      expiry_date,
    } = req.body;

    if (!product_id || !location_id || !quantity_change) {
      return next(
        new AppError(
          "Please provide product_id, location_id, and quantity_change",
          400
        )
      );
    }

    const client: PoolClient = await pool.connect();

    try {
      await client.query("BEGIN");

      const checkResult = await client.query(
        "SELECT * FROM inventory_levels WHERE product_id = $1 AND location_id = $2 AND (batch_number = $3 OR ($3 IS NULL AND batch_number IS NULL))",
        [product_id, location_id, batch_number]
      );

      let inventoryResult;

      if (checkResult.rows.length === 0) {
        if (quantity_change < 0) {
          throw new AppError(
            "Cannot reduce inventory that does not exist",
            400
          );
        }

        inventoryResult = await client.query(
          `INSERT INTO inventory_levels (product_id, location_id, quantity_available, batch_number, expiry_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
          [product_id, location_id, quantity_change, batch_number, expiry_date]
        );
      } else {
        const currentQty = checkResult.rows[0].quantity_available;
        const newQty = currentQty + quantity_change;

        if (newQty < 0) {
          throw new AppError(
            "Insufficient inventory. Cannot reduce below zero.",
            400
          );
        }

        inventoryResult = await client.query(
          `UPDATE inventory_levels 
         SET quantity_available = $1, last_updated = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
          [newQty, checkResult.rows[0].id]
        );
      }

      await client.query(
        `INSERT INTO stock_movements (
        product_id, to_location_id, quantity, movement_type, reason, batch_number, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          product_id,
          location_id,
          Math.abs(quantity_change),
          "adjustment",
          reason,
          batch_number,
          req.user?.id,
        ]
      );

      await client.query("COMMIT");

      res.status(200).json({
        status: "success",
        data: {
          inventoryLevel: inventoryResult.rows[0],
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

export const transferStock = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const {
      product_id,
      from_location_id,
      to_location_id,
      quantity,
      reason,
      batch_number,
    } = req.body;

    if (!product_id || !from_location_id || !to_location_id || !quantity) {
      return next(new AppError("Please provide all required fields", 400));
    }

    if (quantity <= 0) {
      return next(new AppError("Quantity must be greater than zero", 400));
    }

    if (from_location_id === to_location_id) {
      return next(
        new AppError("Source and destination locations must be different", 400)
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const sourceResult = await client.query(
        `SELECT * FROM inventory_levels 
       WHERE product_id = $1 AND location_id = $2 
       AND (batch_number = $3 OR ($3 IS NULL AND batch_number IS NULL))`,
        [product_id, from_location_id, batch_number]
      );

      if (sourceResult.rows.length === 0) {
        throw new AppError("Product not found in source location", 404);
      }

      const sourceInventory = sourceResult.rows[0];
      const availableQty =
        sourceInventory.quantity_available - sourceInventory.quantity_reserved;

      if (availableQty < quantity) {
        throw new AppError(
          `Insufficient available quantity. Available: ${availableQty}`,
          400
        );
      }

      await client.query(
        `UPDATE inventory_levels 
       SET quantity_available = quantity_available - $1, last_updated = CURRENT_TIMESTAMP
       WHERE id = $2`,
        [quantity, sourceInventory.id]
      );

      const destResult = await client.query(
        `SELECT * FROM inventory_levels 
       WHERE product_id = $1 AND location_id = $2 
       AND (batch_number = $3 OR ($3 IS NULL AND batch_number IS NULL))`,
        [product_id, to_location_id, batch_number]
      );

      if (destResult.rows.length === 0) {
        await client.query(
          `INSERT INTO inventory_levels (product_id, location_id, quantity_available, batch_number, expiry_date)
         VALUES ($1, $2, $3, $4, $5)`,
          [
            product_id,
            to_location_id,
            quantity,
            batch_number,
            sourceInventory.expiry_date,
          ]
        );
      } else {
        await client.query(
          `UPDATE inventory_levels 
         SET quantity_available = quantity_available + $1, last_updated = CURRENT_TIMESTAMP
         WHERE id = $2`,
          [quantity, destResult.rows[0].id]
        );
      }

      await client.query(
        `INSERT INTO stock_movements (
        product_id, from_location_id, to_location_id, quantity, 
        movement_type, reason, batch_number, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          product_id,
          from_location_id,
          to_location_id,
          quantity,
          "transfer",
          reason,
          batch_number,
          req.user?.id,
        ]
      );

      await client.query("COMMIT");

      res.status(200).json({
        status: "success",
        message: "Stock transferred successfully",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);
