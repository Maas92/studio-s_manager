import express from "express";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh); // implement refresh to mint new access (+ rotation if you add sessions)
router.post("/logout", authController.logout);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

// Protected routes
router.use(authController.protect);

router.patch("/updateMyPassword", authController.updatePassword);

export default router;
