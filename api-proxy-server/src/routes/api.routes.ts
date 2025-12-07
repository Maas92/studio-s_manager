import { Router } from "express";
import { createProxy } from "../proxies/proxyFactory.js";
import { env } from "../config/env.js";

const router = Router();

// User management (from auth service)
router.use(
  "/users",
  createProxy({
    target: env.AUTH_SERVICE_URL,
    pathRewrite: { "^/api/v1/users": "/api/v1/users" },
    isBackendService: false, // Auth service doesn't need GATEWAY_SECRET
  })
);

// Inventory service routes - ALL need GATEWAY_SECRET
const inventoryRoutes = [
  "products",
  "categories",
  "suppliers",
  "locations",
  "treatments",
  "inventory",
  "sales",
  "clients",
  "appointments",
  "staff",
  "bookings",
];

inventoryRoutes.forEach((route) => {
  router.use(
    `/${route}`,
    createProxy({
      target: env.INVENTORY_SERVICE_URL,
      pathRewrite: { [`^/`]: `/${route}` },
      isBackendService: true, // Backend service requires GATEWAY_SECRET
    })
  );
  console.log(
    `Proxy setup for /${route} to ${env.INVENTORY_SERVICE_URL}/${route}`
  );
});

export default router;
