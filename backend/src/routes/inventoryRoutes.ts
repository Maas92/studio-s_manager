import express from "express";
import * as inventoryController from "../controllers/inventoryController.js";

const router = express.Router();

router.get("/levels", inventoryController.getInventoryLevels);
router.post("/adjust", inventoryController.adjustInventory);
router.post("/transfer", inventoryController.transferStock);

export default router;
