import express from "express";
import * as productController from "../controllers/productController";
import { restrictTo } from "../middleware/userMiddleware";
import { validate } from "../middleware/validation";
import {
  createProductSchema,
  updateProductSchema,
  getProductSchema,
  deleteProductSchema,
  productQuerySchema,
} from "../validators/product.validator";

const router = express.Router();

router
  .route("/")
  .get(validate(productQuerySchema), productController.getAllProducts)
  .post(
    restrictTo("owner", "manager", "admin"),
    validate(createProductSchema),
    productController.createProduct
  );

router
  .route("/:id")
  .get(validate(getProductSchema), productController.getProduct)
  .patch(
    restrictTo("owner", "manager", "admin"),
    validate(updateProductSchema),
    productController.updateProduct
  )
  .delete(
    restrictTo("owner", "admin"),
    validate(deleteProductSchema),
    productController.deleteProduct
  );

export default router;
