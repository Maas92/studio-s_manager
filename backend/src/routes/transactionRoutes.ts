import { Router } from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransaction,
  updateTransaction,
  sendReceipt,
} from '../controllers/transactionController.js';
import { restrictTo } from '../middleware/userMiddleware.js';
import { validateUUID } from '../middleware/validation.js';

const router = Router();

// CRUD operations
router
  .route("/")
  .get(getAllTransactions)
  .post(restrictTo("owner", "manager", "receptionist"), createTransaction);

router
  .route("/:id")
  .get(validateUUID("id"), getTransaction)
  .patch(validateUUID("id"), restrictTo("owner", "manager"), updateTransaction);

// Receipt actions
router.post(
  "/:id/receipt",
  validateUUID("id"),
  restrictTo("owner", "manager", "receptionist"),
  sendReceipt
);

export default router;
