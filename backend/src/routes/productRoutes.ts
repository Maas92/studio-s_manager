import express from "express";
import * as productController from '../controllers/productController.js';
import { restrictTo } from '../middleware/userMiddleware.js';
import { validate } from '../middleware/validation.js';
import {
  createProductSchema,
  updateProductSchema,
  getProductSchema,
  deleteProductSchema,
  productQuerySchema,
} from '../validators/product.validator.js';

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
