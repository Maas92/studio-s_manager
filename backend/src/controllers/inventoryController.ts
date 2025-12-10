import { Response, NextFunction } from "express";
import { pool, getClient } from '../config/database.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { UserRequest } from '../middleware/userMiddleware.js';
import { logger } from '../utils/logger.js';

/**
 * Get inventory levels with optional filtering
 * GET /api/v1/inventory/levels
 */
export const getInventoryLevels = catchAsync(
  async (req: UserRequest, res: Response, _next: NextFunction) => {
    const { location_id, product_id, low_stock, batch_number } = req.query;

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
      queryText += ` AND il.location_id = $${paramCounter}`;
      params.push(location_id);
      paramCounter++;
    }

    if (product_id) {
      queryText += ` AND il.product_id = $${paramCounter}`;
      params.push(product_id);
      paramCounter++;
    }

    if (batch_number) {
      queryText += ` AND il.batch_number = $${paramCounter}`;
      params.push(batch_number);
      paramCounter++;
    }

    if (low_stock === "true") {
      queryText += ` AND il.quantity_available <= p.reorder_level`;
    }

    queryText += " ORDER BY p.name, sl.name";

    const result = await pool.query(queryText, params);

    logger.info(`Inventory levels retrieved: ${result.rows.length} items`);

    res.status(200).json({
      status: "success",
      results: result.rows.length,
      data: {
        inventoryLevels: result.rows,
      },
    });
  }
);

/**
 * Adjust inventory (add or remove)
 * POST /api/v1/inventory/adjust
 */
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

    const client = await getClient();

    try {
      await client.query("BEGIN");

      // Check if inventory level exists
      const checkResult = await client.query(
        `SELECT * FROM inventory_levels 
         WHERE product_id = $1 AND location_id = $2 
         AND (batch_number = $3 OR ($3 IS NULL AND batch_number IS NULL))`,
        [product_id, location_id, batch_number]
      );

      let inventoryResult;

      if (checkResult.rows.length === 0) {
        // Create new inventory level
        if (quantity_change < 0) {
          throw new AppError(
            "Cannot reduce inventory that does not exist",
            400
          );
        }

        inventoryResult = await client.query(
          `INSERT INTO inventory_levels 
           (product_id, location_id, quantity_available, batch_number, expiry_date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [product_id, location_id, quantity_change, batch_number, expiry_date]
        );
      } else {
        // Update existing inventory level
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

      // Record the stock movement
      await client.query(
        `INSERT INTO stock_movements (
          product_id, to_location_id, quantity, movement_type, 
          reason, batch_number, performed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          product_id,
          location_id,
          Math.abs(quantity_change),
          "adjustment",
          reason || "Manual adjustment",
          batch_number,
          req.user?.id,
        ]
      );

      await client.query("COMMIT");

      logger.info(
        `Inventory adjusted by user ${req.user?.id}: Product ${product_id}, Change: ${quantity_change}`
      );

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

/**
 * Transfer stock between locations
 * POST /api/v1/inventory/transfer
 */
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

    const client = await getClient();

    try {
      await client.query("BEGIN");

      // Check source inventory
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
          `Insufficient available quantity. Available: ${availableQty}, Requested: ${quantity}`,
          400
        );
      }

      // Reduce from source
      await client.query(
        `UPDATE inventory_levels 
         SET quantity_available = quantity_available - $1, 
             last_updated = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [quantity, sourceInventory.id]
      );

      // Add to destination
      const destResult = await client.query(
        `SELECT * FROM inventory_levels 
         WHERE product_id = $1 AND location_id = $2 
         AND (batch_number = $3 OR ($3 IS NULL AND batch_number IS NULL))`,
        [product_id, to_location_id, batch_number]
      );

      if (destResult.rows.length === 0) {
        // Create new inventory level at destination
        await client.query(
          `INSERT INTO inventory_levels 
           (product_id, location_id, quantity_available, batch_number, expiry_date)
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
        // Update existing inventory level at destination
        await client.query(
          `UPDATE inventory_levels 
           SET quantity_available = quantity_available + $1, 
               last_updated = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [quantity, destResult.rows[0].id]
        );
      }

      // Record the stock movement
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
          reason || "Stock transfer",
          batch_number,
          req.user?.id,
        ]
      );

      await client.query("COMMIT");

      logger.info(
        `Stock transferred by user ${req.user?.id}: ${quantity} units of product ${product_id} from ${from_location_id} to ${to_location_id}`
      );

      res.status(200).json({
        status: "success",
        message: "Stock transferred successfully",
        data: {
          product_id,
          from_location_id,
          to_location_id,
          quantity,
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
