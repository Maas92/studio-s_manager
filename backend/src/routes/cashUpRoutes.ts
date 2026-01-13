import { Router } from "express";
import {
  createCashUp,
  getAllCashUps,
  getCashUp,
  updateCashUp,
  completeCashUp,
  reconcileCashUp,
  addExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseReceipt,
  addSafeDrop,
  updateSafeDrop,
  deleteSafeDrop,
  getCashUpSummary,
  getDailySnapshot,
} from "../controllers/cashUpController.js";
import { requireAuth, restrictTo } from "../middleware/userMiddleware.js";
import { validateUUID } from "../middleware/validation.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply authentication to ALL routes
router.use(requireAuth);

// Cash-up session routes
router
  .route("/")
  .get(getAllCashUps)
  .post(restrictTo("admin", "manager", "owner", "receptionist"), createCashUp);

// Daily snapshot - current session overview
router.get("/daily-snapshot", getDailySnapshot);

// Summary/reports
router.get("/summary", getCashUpSummary);

router
  .route("/:id")
  .get(validateUUID("id"), getCashUp)
  .patch(
    validateUUID("id"),
    restrictTo("admin", "manager", "owner", "receptionist"),
    updateCashUp
  );

// Complete cash-up
router.post(
  "/:id/complete",
  validateUUID("id"),
  restrictTo("admin", "manager", "owner", "receptionist"),
  completeCashUp
);

// Reconcile cash-up (manager/admin only)
router.post(
  "/:id/reconcile",
  validateUUID("id"),
  restrictTo("admin", "manager", "owner"),
  reconcileCashUp
);

// Expense routes
router.post(
  "/:id/expenses",
  validateUUID("id"),
  restrictTo("admin", "manager", "owner", "receptionist"),
  addExpense
);

router.patch(
  "/:id/expenses/:expenseId",
  validateUUID("id"),
  validateUUID("expenseId"),
  restrictTo("admin", "manager", "owner", "receptionist"),
  updateExpense
);

router.delete(
  "/:id/expenses/:expenseId",
  validateUUID("id"),
  validateUUID("expenseId"),
  restrictTo("admin", "manager", "owner"),
  deleteExpense
);

// Upload expense receipt
router.post(
  "/:id/expenses/:expenseId/receipt",
  validateUUID("id"),
  validateUUID("expenseId"),
  restrictTo("admin", "manager", "owner", "receptionist"),
  upload.single("receipt"),
  uploadExpenseReceipt
);

// Safe drop routes
router.post(
  "/:id/safe-drops",
  validateUUID("id"),
  restrictTo("admin", "manager", "owner", "receptionist"),
  addSafeDrop
);

router.patch(
  "/:id/safe-drops/:dropId",
  validateUUID("id"),
  validateUUID("dropId"),
  restrictTo("admin", "manager", "owner"),
  updateSafeDrop
);

router.delete(
  "/:id/safe-drops/:dropId",
  validateUUID("id"),
  validateUUID("dropId"),
  restrictTo("admin", "manager", "owner"),
  deleteSafeDrop
);

export default router;
