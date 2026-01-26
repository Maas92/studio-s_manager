import { Router } from "express";
import products from "./productRoutes.js";
import inventory from "./inventoryRoutes.js";
import categories from "./categoryRoutes.js";
import suppliers from "./supplierRoutes.js";
import locations from "./locationRoutes.js";
import sales from "./salesRoutes.js";
import clients from "./clientRoutes.js";
import cashUpRoutes from "./cashUpRoutes.js";
import treatmentRoutes from "./treatmentRoutes.js";
import appointmentRoutes from "./appointmentRoutes.js";
import staffRoutes from "./staffRoutes.js";
import stockRoutes from "./stockRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import creditRoutes from "./creditRoutes.js";

const r = Router();

// Core business entities
r.use("/products", products);
r.use("/inventory", inventory);
r.use("/treatments", treatmentRoutes);
r.use("/appointments", appointmentRoutes);
r.use("/clients", clients);
r.use("/cash-ups", cashUpRoutes);
r.use("/staff", staffRoutes);
r.use("/sales", sales);
r.use("/transactions", transactionRoutes); // For POS
r.use("/stock", stockRoutes);
r.use("/credits", creditRoutes);

// Supporting/lookup tables
r.use("/categories", categories);
r.use("/suppliers", suppliers);
r.use("/locations", locations);

export default r;
