import { Router } from "express";
import {
  createStaff,
  getAllStaff,
  getStaff,
  updateStaff,
  deleteStaff,
  getStaffPerformance,
} from "../controllers/staffController.js";
import { restrictTo } from "../middleware/userMiddleware.js";
import { validateUUID } from "../middleware/validation.js";

const router = Router();

// CRUD operations
router
  .route("/")
  .get(getAllStaff)
  .post(restrictTo("admin", "manager", "owner"), createStaff);

router
  .route("/:id")
  .get(validateUUID("id"), getStaff)
  .patch(validateUUID("id"), restrictTo("admin", "owner"), updateStaff)
  .delete(validateUUID("id"), restrictTo("admin", "owner"), deleteStaff);

// Staff performance
router.get(
  "/:id/performance",
  validateUUID("id"),
  restrictTo("owner", "manager"),
  getStaffPerformance
);

export default router;
