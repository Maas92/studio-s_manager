import { Response, NextFunction } from "express";
import { UserRequest } from "../middleware/userMiddleware";
import { productService } from "../services/product.service";
import catchAsync from "../utils/catchAsync";
import { logger } from "../utils/logger";

/**
 * Get all products with filtering and pagination
 * GET /api/v1/products
 */
export const getAllProducts = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const filters = {
      category_id: req.query.category_id as string,
      supplier_id: req.query.supplier_id as string,
      active:
        req.query.active === "true"
          ? true
          : req.query.active === "false"
          ? false
          : undefined,
      retail:
        req.query.retail === "true"
          ? true
          : req.query.retail === "false"
          ? false
          : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort: req.query.sort as string,
    };

    const result = await productService.findAll(filters);

    logger.info(`Products retrieved: ${result.products.length} items`);

    res.status(200).json({
      status: "success",
      results: result.products.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      data: {
        products: result.products,
      },
    });
  }
);

/**
 * Get a single product by ID
 * GET /api/v1/products/:id
 */
export const getProduct = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const product = await productService.findById(req.params.id);

    logger.info(`Product retrieved: ${req.params.id}`);

    res.status(200).json({
      status: "success",
      data: {
        product,
      },
    });
  }
);

/**
 * Create a new product
 * POST /api/v1/products
 */
export const createProduct = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const product = await productService.create(req.body);

    logger.info(`Product created by user ${req.user?.id}: ${product.id}`);

    res.status(201).json({
      status: "success",
      data: {
        product,
      },
    });
  }
);

/**
 * Update a product
 * PATCH /api/v1/products/:id
 */
export const updateProduct = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const product = await productService.update(req.params.id, req.body);

    logger.info(`Product updated by user ${req.user?.id}: ${req.params.id}`);

    res.status(200).json({
      status: "success",
      data: {
        product,
      },
    });
  }
);

/**
 * Delete a product
 * DELETE /api/v1/products/:id
 */
export const deleteProduct = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    await productService.delete(req.params.id);

    logger.info(`Product deleted by user ${req.user?.id}: ${req.params.id}`);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);
