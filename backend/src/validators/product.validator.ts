import { z } from "zod";

// Base product schema for creation
export const createProductSchema = z.object({
  body: z.object({
    sku: z
      .string()
      .min(1, "SKU is required")
      .max(100, "SKU must be less than 100 characters")
      .trim(),
    name: z
      .string()
      .min(1, "Product name is required")
      .max(255, "Product name must be less than 255 characters")
      .trim(),
    category_id: z.string().uuid("Invalid category ID").nullable().optional(),
    supplier_id: z.string().uuid("Invalid supplier ID").nullable().optional(),
    cost_cents: z
      .number()
      .int("Cost must be an integer")
      .nonnegative("Cost cannot be negative"),
    price_cents: z
      .number()
      .int("Price must be an integer")
      .nonnegative("Price cannot be negative"),
    retail: z.boolean().default(false),
    active: z.boolean().default(true),
  }),
});

// Schema for updating a product (all fields optional)
export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid product ID"),
  }),
  body: z.object({
    sku: z
      .string()
      .min(1, "SKU cannot be empty")
      .max(100, "SKU must be less than 100 characters")
      .trim()
      .optional(),
    name: z
      .string()
      .min(1, "Product name cannot be empty")
      .max(255, "Product name must be less than 255 characters")
      .trim()
      .optional(),
    category_id: z.string().uuid("Invalid category ID").nullable().optional(),
    supplier_id: z.string().uuid("Invalid supplier ID").nullable().optional(),
    cost_cents: z
      .number()
      .int("Cost must be an integer")
      .nonnegative("Cost cannot be negative")
      .optional(),
    price_cents: z
      .number()
      .int("Price must be an integer")
      .nonnegative("Price cannot be negative")
      .optional(),
    retail: z.boolean().optional(),
    active: z.boolean().optional(),
  }),
});

// Schema for getting a single product
export const getProductSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid product ID"),
  }),
});

// Schema for deleting a product
export const deleteProductSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid product ID"),
  }),
});

// Schema for product query parameters
export const productQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    search: z.string().optional(),
    category_id: z.string().uuid().optional(),
    supplier_id: z.string().uuid().optional(),
    active: z.enum(["true", "false"]).optional(),
    retail: z.enum(["true", "false"]).optional(),
  }),
});
