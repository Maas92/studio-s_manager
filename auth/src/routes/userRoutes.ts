import express from "express";
import * as authController from "../controllers/authController.js";
import * as userController from "../controllers/userController.js";

const router = express.Router();

// All routes are protected
router.use(authController.protect);

router.get("/me", userController.getMe, userController.getUser);
router.patch("/updateMe", userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);

// Admin only routes
router.use(authController.restrictTo("admin", "manager"));

router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

export default router;
