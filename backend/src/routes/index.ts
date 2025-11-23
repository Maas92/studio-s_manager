// src/routes/index.ts
import { Router } from "express";
import products from "./productRoutes.js";
import inventory from "./inventoryRoutes.js";
import categories from "./categoryRoutes.js";
import suppliers from "./supplierRoutes.js";
import locations from "./locationRoutes.js";
import sales from "./salesRoutes.js";
import clients from "./clientRoutes.js";

const r = Router();
r.use("/products", products);
r.use("/inventory", inventory);
r.use("/categories", categories);
r.use("/suppliers", suppliers);
r.use("/locations", locations);
r.use("/sales", sales);
r.use("/clients", clients);
export default r;
