import express from "express";
import * as productController from "../controllers/productController.js";
import { restrictTo } from "../middleware/userMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(productController.getAllProducts)
  .post(restrictTo("admin", "manager"), productController.createProduct);

router
  .route("/:id")
  .get(productController.getProduct)
  .patch(restrictTo("admin", "manager"), productController.updateProduct)
  .delete(restrictTo("admin"), productController.deleteProduct);

export default router;
