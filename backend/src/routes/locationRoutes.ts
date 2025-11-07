import express from "express";
import { pool } from "../config/database.js";
import { z } from "zod";
import { restrictTo } from "../middleware/userMiddleware.js";

const router = express.Router();
const Create = z.object({ code: z.string().min(1), name: z.string().min(1) });
const Update = Create.partial();

router.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.locations ORDER BY name ASC`
  );
  res.json({ items: rows });
});
router.post("/", restrictTo("owner", "manager"), async (req, res) => {
  const p = Create.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO public.locations (code, name) VALUES ($1,$2) RETURNING *`,
    [p.code, p.name]
  );
  res.status(201).json(rows[0]);
});
router.patch("/:id", restrictTo("owner", "manager"), async (req, res) => {
  const p = Update.parse(req.body);
  const { rows } = await pool.query(
    `UPDATE public.locations SET code=COALESCE($1,code), name=COALESCE($2,name), updated_at=NOW() WHERE id=$3 RETURNING *`,
    [p.code ?? null, p.name ?? null, req.params.id]
  );
  res.json(rows[0]);
});
router.delete("/:id", restrictTo("owner"), async (req, res) => {
  await pool.query(`DELETE FROM public.locations WHERE id=$1`, [req.params.id]);
  res.status(204).send();
});

export default router;
