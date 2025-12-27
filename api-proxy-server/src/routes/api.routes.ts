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

// Google Contacts Sync Service routes
router.use(
  "/google-contacts",
  createProxy({
    target: env.GOOGLE_CONTACTS_SERVICE_URL, // http://google-contacts:5004
    isBackendService: true, // Will add x-gateway-key
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
  "stock",
];

inventoryRoutes.forEach((route) => {
  router.use(
    `/${route}`,
    createProxy({
      target: env.INVENTORY_SERVICE_URL,
      isBackendService: true,
    })
  );
});

export default router;
