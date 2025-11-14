import { Router } from "express";
import { createProxy } from "../proxies/proxyFactory.js";
import { env } from "../config/env.js";

const router = Router();

// User management (from auth service)
router.use(
  "/users",
  createProxy({
    target: env.AUTH_SERVICE_URL,
    // Won't match because route is already stripped Router already consumed /api/v1
    pathRewrite: { "^/api/v1/users": "/api/v1/users" },
    // Path should stay the same - pathRewrite: {} - /api/v1/products → /api/v1/products
  })
);

// Inventory service routes
const inventoryRoutes = ["products", "categories", "suppliers", "locations"]; // Will need to add all backend routes here

inventoryRoutes.forEach((route) => {
  router.use(
    `/${route}`,
    createProxy({
      target: env.INVENTORY_SERVICE_URL,
      pathRewrite: { [`^/api/v1/${route}`]: `/api/v1/${route}` },
    })
  );
});

export default router;
