import { Request, Response, NextFunction } from "express";
import { getClient } from "../config/database.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { createSaleSchema } from "../validators/sale.validator.js";

export const createSale = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Validate Input
    const validation = createSaleSchema.safeParse(req);
    if (!validation.success) {
      return next(
        new AppError((validation.error as any).errors[0].message, 400)
      );
    }

    const {
      clientId,
      items,
      discount,
      payments,
      tips,
      loyaltyPointsRedeemed,
      clientName,
    } = validation.data.body;

    const client = await getClient();

    try {
      await client.query("BEGIN");

      // 2. Calculate Totals
      let subtotal = 0;
      items.forEach((item) => {
        subtotal += item.price * item.quantity;
      });

      let discountAmount = 0;
      if (discount.type === "percentage") {
        discountAmount = (subtotal * discount.value) / 100;
      } else {
        discountAmount = discount.value;
      }

      // Ensure discount doesn't exceed subtotal
      discountAmount = Math.min(discountAmount, subtotal);

      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * 0.15; // 15% Tax Hardcoded for now

      let tipsTotal = 0;
      if (tips) {
        Object.values(tips).forEach((tip) => {
          tipsTotal += tip;
        });
      }

      const finalAmount = afterDiscount + taxAmount + tipsTotal;

      // 3. Insert Sale
      // If clientId is provided, use it. If not, we store NULL.
      // We currently don't have a way to store "Walk-in Client Name" in the sales table structure
      // except in the notes or by creating a temporary client.
      // For now, we'll append the clientName to notes if it's a walk-in.

      let notes = "";
      if (!clientId && clientName) {
        notes = `Walk-in Client: ${clientName}`;
      }

      const saleResult = await client.query(
        `INSERT INTO sales (
          client_id, 
          staff_id, 
          sale_date, 
          total_amount, 
          discount_amount, 
          tax_amount, 
          tips_total, 
          final_amount, 
          status, 
          receipt_number,
          notes
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          clientId || null,
          items[0].staffId || null, // Primary staff (fallback to first item's staff)
          subtotal,
          discountAmount,
          taxAmount,
          tipsTotal,
          finalAmount,
          "completed",
          `REC-${Date.now()}`, // Simple receipt number generation
          notes,
        ]
      );

      const sale = saleResult.rows[0];

      // 4. Insert Sale Items
      for (const item of items) {
        // Determine service_id vs product_id
        // If type is 'treatment' or 'appointment', we assume it maps to a service.
        // However, the frontend sends 'treatmentId' or 'appointmentId'.
        // We need to map these to 'service_id'.
        // For appointments, the appointment itself is NOT the service definition, but it links to one.
        // But here we are recording the SALE of the service.
        // Ideally we should have the serviceId in the cart item.
        // Assuming treatmentId IS the serviceId for treatments.

        const serviceId =
          item.type === "treatment" || item.type === "appointment"
            ? item.treatmentId || item.appointmentId
            : null;

        const productId = item.type === "product" ? item.productId : null;

        await client.query(
          `INSERT INTO sale_items (
            sale_id, 
            product_id, 
            treatment_id,
            quantity, 
            unit_price, 
            discount_amount, 
            subtotal, 
            staff_id, 
            staff_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            sale.id,
            productId,
            serviceId,
            item.quantity,
            item.price,
            item.discount || 0,
            item.price * item.quantity,
            item.staffId || null,
            item.staffName || null,
          ]
        );

        // 5. Update Inventory (only for products)
        if (item.type === "product" && productId) {
          await client.query(
            `UPDATE inventory_levels 
              SET quantity_available = quantity_available - $1 
              WHERE product_id = $2`,
            [item.quantity, productId]
          );
        }
      }

      // 6. Insert Payments
      for (const payment of payments) {
        await client.query(
          `INSERT INTO payments (sale_id, method, amount) VALUES ($1, $2, $3)`,
          [sale.id, payment.method, payment.amount]
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        status: "success",
        data: {
          sale,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  }
);
