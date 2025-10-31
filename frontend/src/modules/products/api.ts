import { api } from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";

export const ProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  price: z.number(),
  retail: z.boolean().optional().default(true),
});
export type Product = z.infer<typeof ProductSchema>;

export async function listProducts() {
  const { data } = await api.get("/products");
  return toArray<Product>(data);
}

export async function createProduct(payload: Omit<Product, "id">) {
  const { data } = await api.post<Product>("/products", payload);
  return data;
}
