import express from "express";
import * as inventoryController from '../controllers/inventoryController.js';
import { restrictTo } from '../middleware/userMiddleware.js';
import { validate } from '../middleware/validation.js';
import {
  adjustInventorySchema,
  transferStockSchema,
  inventoryLevelsQuerySchema,
} from '../validators/inventory.validator.js';

const router = express.Router();

router.get(
  "/levels",
  validate(inventoryLevelsQuerySchema),
  inventoryController.getInventoryLevels
);

router.post(
  "/adjust",
  restrictTo("owner", "manager", "admin"),
  validate(adjustInventorySchema),
  inventoryController.adjustInventory
);

router.post(
  "/transfer",
  restrictTo("owner", "manager", "admin"),
  validate(transferStockSchema),
  inventoryController.transferStock
);

export default router;
