import { Router } from "express";
import {
  getClientBalance,
  getClientHistory,
  getClientSummary,
  addCredit,
  redeemCredit,
  adjustCredit,
  getClientsWithCredit,
} from "../controllers/creditController.js";
import { requireAuth, restrictTo } from "../middleware/userMiddleware.js";
import { validateUUID } from "../middleware/validation.js";

const router = Router();

// Apply authentication to ALL routes
router.use(requireAuth);

// Get client credit balance
router.get("/balance/:clientId", getClientBalance);

// Get client credit history
router.get("/history/:clientId", getClientHistory);

// Get client credit summary
router.get("/summary/:clientId", getClientSummary);

// Add credit (prepayment or change)
router.post(
  "/add",
  restrictTo("admin", "manager", "owner", "receptionist"),
  addCredit,
);

// Redeem credit
router.post(
  "/redeem",
  restrictTo("admin", "manager", "owner", "receptionist"),
  redeemCredit,
);

// Adjust credit (admin only)
router.post("/adjust", restrictTo("admin", "manager", "owner"), adjustCredit);

// Get clients with credit balance
router.get(
  "/clients-with-balance",
  restrictTo("admin", "manager", "owner"),
  getClientsWithCredit,
);

export default router;
