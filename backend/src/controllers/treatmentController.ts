import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import {
  createTreatmentSchema,
  updateTreatmentSchema,
} from "../validators/treatment.validator.js";
import { ZodError } from "zod";

// Helper to map DB row to API object
function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    price: Number(row.price),
    category: row.category,
    benefits: row.benefits || [],
    contraindications: row.contraindications || [],
    preparationInstructions: row.preparation_instructions,
    aftercareInstructions: row.aftercare_instructions,
    availableFor: row.available_for || [],
    imageUrl: row.image_url,
    isActive: row.is_active,
    popularityScore: row.popularity_score,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/v1/treatments
export const getAllTreatments = catchAsync(
  async (req: Request, res: Response) => {
    const q = `SELECT * FROM treatments ORDER BY created_at DESC`;
    const { rows } = await pool.query(q);
    res.status(200).json({
      status: "success",
      results: rows.length,
      data: { treatments: rows.map(mapRow) },
    });
  }
);

// GET /api/v1/treatments/:id
export const getTreatment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const q = `SELECT * FROM treatments WHERE id = $1 LIMIT 1`;
    const { rows } = await pool.query(q, [req.params.id]);
    if (rows.length === 0)
      return next(AppError.notFound("Treatment not found"));
    res
      .status(200)
      .json({ status: "success", data: { treatment: mapRow(rows[0]) } });
  }
);

// POST /api/v1/treatments
export const createTreatment = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    try {
      createTreatmentSchema.parse({ body: req.body });
    } catch (err) {
      if (err instanceof ZodError)
        return next(
          AppError.badRequest(err.issues.map((i) => i.message).join(", "))
        );
      throw err;
    }

    const b = req.body;
    const q = `
    INSERT INTO treatments
      (name, description, duration_minutes, price, category,
       benefits, contraindications,
       preparation_instructions, aftercare_instructions,
       available_for, image_url, is_active, popularity_score, tags, created_at, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now(), now())
    RETURNING *;
  `;
    // store arrays as Postgres arrays or jsonb accordingly
    const params = [
      b.name,
      b.description || null,
      b.durationMinutes,
      b.price,
      b.category || null,
      b.benefits ? JSON.stringify(b.benefits) : null, // benefits -> JSONB
      b.contraindications ? JSON.stringify(b.contraindications) : null,
      b.preparationInstructions || null,
      b.aftercareInstructions || null,
      b.availableFor && b.availableFor.length ? b.availableFor : null, // TEXT[]
      b.imageUrl || null,
      typeof b.isActive === "boolean" ? b.isActive : true,
      b.popularityScore || 0,
      b.tags && b.tags.length ? b.tags : null, // TEXT[]
    ];

    const { rows } = await pool.query(q, params);
    res
      .status(201)
      .json({ status: "success", data: { treatment: mapRow(rows[0]) } });
  }
);

// PATCH /api/v1/treatments/:id
export const updateTreatment = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    try {
      updateTreatmentSchema.parse({ body: req.body });
    } catch (err) {
      if (err instanceof ZodError)
        return next(
          AppError.badRequest(err.issues.map((i) => i.message).join(", "))
        );
      throw err;
    }

    // Build dynamic SET clause (safe parameterized)
    const fields = [];
    const values: any[] = [];
    let idx = 1;
    const b = req.body;
    const pushField = (col: string, val: any) => {
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    };

    if (b.name !== undefined) pushField("name", b.name);
    if (b.description !== undefined) pushField("description", b.description);
    if (b.durationMinutes !== undefined)
      pushField("duration_minutes", b.durationMinutes);
    if (b.price !== undefined) pushField("price", b.price);
    if (b.category !== undefined) pushField("category", b.category);
    if (b.benefits !== undefined)
      pushField("benefits", b.benefits ? JSON.stringify(b.benefits) : null);
    if (b.contraindications !== undefined)
      pushField(
        "contraindications",
        b.contraindications ? JSON.stringify(b.contraindications) : null
      );
    if (b.preparationInstructions !== undefined)
      pushField("preparation_instructions", b.preparationInstructions);
    if (b.aftercareInstructions !== undefined)
      pushField("aftercare_instructions", b.aftercareInstructions);
    if (b.availableFor !== undefined)
      pushField(
        "available_for",
        b.availableFor && b.availableFor.length ? b.availableFor : null
      );
    if (b.imageUrl !== undefined) pushField("image_url", b.imageUrl);
    if (b.isActive !== undefined) pushField("is_active", b.isActive);
    if (b.popularityScore !== undefined)
      pushField("popularity_score", b.popularityScore);
    if (b.tags !== undefined)
      pushField("tags", b.tags && b.tags.length ? b.tags : null);

    if (fields.length === 0)
      return next(AppError.badRequest("No fields provided for update"));

    // add updated_at
    fields.push(`updated_at = now()`);

    const sql = `UPDATE treatments SET ${fields.join(
      ", "
    )} WHERE id = $${idx} RETURNING *`;
    values.push(req.params.id);

    const { rows } = await pool.query(sql, values);
    if (rows.length === 0)
      return next(AppError.notFound("Treatment not found"));
    res
      .status(200)
      .json({ status: "success", data: { treatment: mapRow(rows[0]) } });
  }
);

// DELETE /api/v1/treatments/:id
export const deleteTreatment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const q = `DELETE FROM treatments WHERE id = $1 RETURNING id`;
    const { rows } = await pool.query(q, [req.params.id]);
    if (rows.length === 0)
      return next(AppError.notFound("Treatment not found"));
    res.status(204).json({ status: "success", data: null });
  }
);
