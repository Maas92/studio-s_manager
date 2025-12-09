import { createResourceClient } from "../services/resourceFactory";
import {
  ProductSchema,
  CreateProductSchema,
  type Product,
  type CreateProductInput,
} from "../modules/POS/POSSchema";

export const productsClient = createResourceClient<Product, CreateProductInput>(
  {
    basePath: "/products",
    schema: ProductSchema,
    createSchema: CreateProductSchema,
  }
);
