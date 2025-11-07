// src/routes/index.ts
import { Router } from "express";
import products from "./productRoutes.js";
import inventory from "./inventoryRoutes.js";
import categories from "./categoryRoutes.js";
import suppliers from "./supplierRoutes.js";
import locations from "./locationRoutes.js";

const r = Router();
r.use("/products", products);
r.use("/inventory", inventory);
r.use("/categories", categories);
r.use("/suppliers", suppliers);
r.use("/locations", locations);
export default r;
