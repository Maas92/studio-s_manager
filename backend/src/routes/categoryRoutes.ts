import express from "express";
import { pool } from "../config/database.js";
import { z } from "zod";
import { restrictTo } from "../middleware/userMiddleware.js";

const router = express.Router();
const Create = z.object({
  name: z.string().min(1),
  parent_category_id: z.string().uuid().nullable().optional(),
});
const Update = Create.partial();

router.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.categories ORDER BY name ASC`
  );
  res.json({ items: rows });
});
router.post("/", restrictTo("owner", "manager"), async (req, res) => {
  const p = Create.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO public.categories (name, parent_category_id) VALUES ($1,$2) RETURNING *`,
    [p.name, p.parent_category_id ?? null]
  );
  res.status(201).json(rows[0]);
});
router.patch("/:id", restrictTo("owner", "manager"), async (req, res) => {
  const p = Update.parse(req.body);
  const { rows } = await pool.query(
    `UPDATE public.categories SET name=COALESCE($1,name), parent_category_id=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
    [p.name ?? null, p.parent_category_id ?? null, req.params.id]
  );
  res.json(rows[0]);
});
router.delete("/:id", restrictTo("owner"), async (req, res) => {
  await pool.query(`DELETE FROM public.categories WHERE id=$1`, [
    req.params.id,
  ]);
  res.status(204).send();
});

export default router;
