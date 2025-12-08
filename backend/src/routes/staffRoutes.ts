import { Router } from "express";
import {
  createStaff,
  getAllStaff,
  getStaff,
  updateStaff,
  deleteStaff,
  getStaffPerformance,
} from "../controllers/staffController";
import { restrictTo } from "../middleware/userMiddleware";
import { validateUUID } from "../middleware/validation";

const router = Router();

// CRUD operations
router
  .route("/")
  .get(getAllStaff)
  .post(restrictTo("owner", "manager"), createStaff);

router
  .route("/:id")
  .get(validateUUID("id"), getStaff)
  .patch(validateUUID("id"), restrictTo("owner", "manager"), updateStaff)
  .delete(validateUUID("id"), restrictTo("owner"), deleteStaff);

// Staff performance
router.get(
  "/:id/performance",
  validateUUID("id"),
  restrictTo("owner", "manager"),
  getStaffPerformance
);

export default router;
