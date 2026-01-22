import express from "express";
import {
  getStaffKPIs,
  getKPI,
  createKPI,
  updateKPI,
  deleteKPI,
  getKPISummary,
} from "../controllers/staffKPIController.js";
import { restrictTo } from "../middleware/userMiddleware.js";
import { validateUUID } from "../middleware/validation.js";

const router = express.Router();

// Get all KPIs for a staff member
router.get("/staff/:staffId/kpis", getStaffKPIs);

// Get KPI summary for a staff member (yearly overview)
router.get("/staff/:staffId/kpis/summary", getKPISummary);

// Get single KPI by ID
router.get("/staff/kpis/:id", validateUUID("id"), getKPI);

// Create new KPI (admin/manager only)
router.post("/staff/kpis", restrictTo("admin", "owner", "manager"), createKPI);

// Update KPI (admin/manager only)
router.patch(
  "/staff/kpis/:id",
  validateUUID("id"),
  restrictTo("admin", "owner", "manager"),
  updateKPI,
);

// Delete KPI (admin/owner only)
router.delete(
  "/staff/kpis/:id",
  validateUUID("id"),
  restrictTo("admin", "owner"),
  deleteKPI,
);

export default router;
