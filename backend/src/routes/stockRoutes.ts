import { Router } from "express";
import {
  createStockItem,
  getAllStockItems,
  getStockItem,
  updateStockItem,
  deleteStockItem,
  transferStock,
} from "../controllers/stockController.js";
import { restrictTo } from "../middleware/userMiddleware.js";
import { validateUUID } from "../middleware/validation.js";

const router = Router();

// CRUD operations
router
  .route("/")
  .get(getAllStockItems)
  .post(restrictTo("admin", "owner", "manager"), createStockItem);

router
  .route("/:id")
  .get(validateUUID("id"), getStockItem)
  .patch(
    validateUUID("id"),
    restrictTo("admin", "owner", "manager"),
    updateStockItem
  )
  .delete(
    validateUUID("id"),
    restrictTo("admin", "owner", "manager"),
    deleteStockItem
  );

// Stock transfers
router.post(
  "/transfer",
  restrictTo("admin", "owner", "manager"),
  transferStock
);

export default router;
