import { useResource } from "../../hooks/useResource";
import { productsClient } from "../../services/productsClient";
import type { Product, CreateProductInput } from "./POSSchema";

export function useProducts() {
  return useResource<Product, CreateProductInput>({
    resourceKey: "products",
    client: productsClient,
    toastMessages: {
      create: "Product created",
      update: "Product updated",
      delete: "Product removed",
    },
  });
}
