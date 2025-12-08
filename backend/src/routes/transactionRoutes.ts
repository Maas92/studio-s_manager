import { Router } from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransaction,
  updateTransaction,
  sendReceipt,
} from "../controllers/transactionController";
import { restrictTo } from "../middleware/userMiddleware";
import { validateUUID } from "../middleware/validation";

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
