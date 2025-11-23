import { Request, Response, NextFunction } from "express";
import { query } from "../config/database.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import {
  createClientSchema,
  searchClientSchema,
} from "../validators/client.validator.js";

export const createClient = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = createClientSchema.safeParse(req);
    if (!validation.success) {
      return next(
        new AppError((validation.error as any).errors[0].message, 400)
      );
    }

    const { name, email, phone } = validation.data.body;

    // Split name into first and last name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "."; // Default last name if missing

    const result = await query(
      `INSERT INTO clients (
        first_name, 
        last_name, 
        email, 
        phone, 
        whatsapp,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [firstName, lastName, email || null, phone, phone] // Using phone as whatsapp by default
    );

    res.status(201).json({
      status: "success",
      data: {
        client: result.rows[0],
      },
    });
  }
);

export const searchClients = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = searchClientSchema.safeParse(req);
    if (!validation.success) {
      return next(new AppError("Invalid search parameters", 400));
    }

    const { q } = validation.data.query;

    if (!q) {
      return res.status(200).json({
        status: "success",
        data: {
          clients: [],
        },
      });
    }

    const searchTerm = `%${q}%`;

    const result = await query(
      `SELECT * FROM clients 
       WHERE 
         first_name ILIKE $1 OR 
         last_name ILIKE $1 OR 
         phone ILIKE $1 OR
         email ILIKE $1
       LIMIT 10`,
      [searchTerm]
    );

    // Map backend fields to frontend expected format if necessary
    // Frontend expects: id, name, email, phone
    const clients = result.rows.map((client: any) => ({
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      email: client.email,
      phone: client.phone,
    }));

    res.status(200).json({
      status: "success",
      data: {
        clients,
      },
    });
  }
);
