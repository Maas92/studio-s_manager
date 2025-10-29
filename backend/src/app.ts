import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

// import AppError from './utils/appError';
// import globalErrorHandler from './controllers/errorController';
// import userMiddleware from './middleware/userMiddleware';

// // Route imports
// import productRouter from './routes/productRoutes';
// import inventoryRouter from './routes/inventoryRoutes';
// import categoryRouter from './routes/categoryRoutes';
// import supplierRouter from './routes/supplierRoutes';
// import locationRouter from './routes/locationRoutes';

const app = express();

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
// app.use(userMiddleware.extractUser);

// 2) ROUTES
// app.use('/api/v1/products', productRouter);
// app.use('/api/v1/inventory', inventoryRouter);
// app.use('/api/v1/categories', categoryRouter);
// app.use('/api/v1/suppliers', supplierRouter);
// app.use('/api/v1/locations', locationRouter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "inventory-service" });
});

// Handle undefined routes
// app.all('*', (req, res, next) => {
//   next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

// Global error handler
// app.use(globalErrorHandler);

export default app;
