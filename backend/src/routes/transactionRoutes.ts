import { Router } from "express";
import {
  createTransaction,
  listTransactions, // Changed from getAllTransactions
  getTransaction,
  updateTransactionStatus, // Changed from updateTransaction
  sendReceipt,
  printReceipt, // Added
  getTransactionStats, // Added
} from "../controllers/transactionController.js";
import { restrictTo } from "../middleware/userMiddleware.js";
import { validateUUID } from "../middleware/validation.js";

const router = Router();

// Statistics endpoint (must be before /:id to avoid matching "stats" as an id)
router.get("/stats", restrictTo("owner", "manager"), getTransactionStats);

// CRUD operations
router
  .route("/")
  .get(listTransactions) // Changed from getAllTransactions
  .post(restrictTo("owner", "manager", "receptionist"), createTransaction);

router.route("/:id").get(validateUUID("id"), getTransaction);

// Status update endpoint (more specific than generic update)
router.patch(
  "/:id/status",
  validateUUID("id"),
  restrictTo("owner", "manager"),
  updateTransactionStatus // Changed from updateTransaction
);

// Receipt actions
router.post(
  "/:id/receipt",
  validateUUID("id"),
  restrictTo("owner", "manager", "receptionist"),
  sendReceipt
);

router.get(
  "/:id/receipt",
  validateUUID("id"),
  restrictTo("owner", "manager", "receptionist"),
  printReceipt // Added for PDF generation
);

export default router;
