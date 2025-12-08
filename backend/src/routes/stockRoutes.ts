import { Router } from "express";
import {
  createStockItem,
  getAllStockItems,
  getStockItem,
  updateStockItem,
  deleteStockItem,
  transferStock,
} from "../controllers/stockController";
import { restrictTo } from "../middleware/userMiddleware";
import { validateUUID } from "../middleware/validation";

const router = Router();

// CRUD operations
router
  .route("/")
  .get(getAllStockItems)
  .post(restrictTo("owner", "manager"), createStockItem);

router
  .route("/:id")
  .get(validateUUID("id"), getStockItem)
  .patch(validateUUID("id"), restrictTo("owner", "manager"), updateStockItem)
  .delete(validateUUID("id"), restrictTo("owner", "manager"), deleteStockItem);

// Stock transfers
router.post("/transfer", restrictTo("owner", "manager"), transferStock);

export default router;
