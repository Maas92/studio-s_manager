import express from "express";
import * as userController from "../controllers/userController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateUserSchema } from "../utils/validators.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Current user routes
router.get("/me", userController.getMe);
router.patch("/me", validate(updateUserSchema), userController.updateMe);
router.delete("/me", userController.deleteMe);

// Admin/Manager only routes
router.use(restrictTo("admin", "manager"));

router.get("/", userController.getAllUsers);
router.get("/stats", userController.getUserStats);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(validate(updateUserSchema), userController.updateUser)
  .delete(userController.deleteUser);

export default router;
