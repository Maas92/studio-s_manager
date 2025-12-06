import { Router } from "express";
import products from "./productRoutes.js";
import inventory from "./inventoryRoutes.js";
import categories from "./categoryRoutes.js";
import suppliers from "./supplierRoutes.js";
import locations from "./locationRoutes.js";
import sales from "./salesRoutes.js";
import clients from "./clientRoutes.js";
import treatmentRoutes from "./treatmentRoutes.js";
import appointmentRoutes from "./appointmentRoutes.js";
// import staffRoutes from "./staffRoutes.js";

const r = Router();

// Core business entities
r.use("/products", products);
r.use("/inventory", inventory);
r.use("/treatments", treatmentRoutes);
r.use("/appointments", appointmentRoutes);
r.use("/clients", clients);
// r.use("/staff", staffRoutes);
r.use("/sales", sales);

// Supporting/lookup tables
r.use("/categories", categories);
r.use("/suppliers", suppliers);
r.use("/locations", locations);

export default r;
