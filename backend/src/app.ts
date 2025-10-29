import express, { Application, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";
import { extractUser } from "./middleware/userMiddleware.js";

// Route imports
import productRouter from "./routes/productRoutes.js";
import inventoryRouter from "./routes/inventoryRoutes.js";
import categoryRouter from "./routes/categoryRoutes.js";
import supplierRouter from "./routes/supplierRoutes.js";
import locationRouter from "./routes/locationRoutes.js";

const app: Application = express();

// 1) GLOBAL MIDDLEWARES
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// CORS
app.use(cors());

// Extract user info from headers (set by API Gateway)
app.use(extractUser);

// 2) ROUTES
app.use("/api/v1/products", productRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/suppliers", supplierRouter);
app.use("/api/v1/locations", locationRouter);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", service: "inventory-service" });
});

// Handle undefined routes
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

export default app;
