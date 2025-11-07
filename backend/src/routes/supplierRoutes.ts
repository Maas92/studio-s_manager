import express from "express";
import { pool } from "../config/database.js";
import { z } from "zod";
import { restrictTo } from "../middleware/userMiddleware.js";

const router = express.Router();
const Create = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
const Update = Create.partial();

router.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.suppliers ORDER BY name ASC`
  );
  res.json({ items: rows });
});
router.post("/", restrictTo("owner", "manager"), async (req, res) => {
  const p = Create.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO public.suppliers (name, email, phone) VALUES ($1,$2,$3) RETURNING *`,
    [p.name, p.email || null, p.phone || null]
  );
  res.status(201).json(rows[0]);
});
router.patch("/:id", restrictTo("owner", "manager"), async (req, res) => {
  const p = Update.parse(req.body);
  const { rows } = await pool.query(
    `UPDATE public.suppliers SET name=COALESCE($1,name), email=$2, phone=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
    [p.name ?? null, p.email ?? null, p.phone ?? null, req.params.id]
  );
  res.json(rows[0]);
});
router.delete("/:id", restrictTo("owner"), async (req, res) => {
  await pool.query(`DELETE FROM public.suppliers WHERE id=$1`, [req.params.id]);
  res.status(204).send();
});

export default router;
