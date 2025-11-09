import express from "express";
import * as authController from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  authLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimiter.js";
import {
  signupSchema,
  loginSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validators.js";

const router = express.Router();

// Public routes
router.post(
  "/signup",
  authLimiter,
  validate(signupSchema),
  authController.signup
);

router.post("/login", authLimiter, validate(loginSchema), authController.login);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.patch(
  "/reset-password/:token",
  validate(resetPasswordSchema),
  authController.resetPassword
);

// Protected routes
router.use(protect);

router.get("/me", authController.me);

router.patch(
  "/update-password",
  validate(updatePasswordSchema),
  authController.updatePassword
);

export default router;
