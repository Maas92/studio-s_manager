import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";

const port = Number(process.env.PORT || 4000);

const server = app.listen(port, () => {
  console.log(`🚀 API Gateway running on port ${port}`);
  console.log(`📍 Auth Service: ${process.env.AUTH_SERVICE_URL}`);
  console.log(`📍 Inventory Service: ${process.env.INVENTORY_SERVICE_URL}`);
});

process.on("unhandledRejection", (err: any) => {
  console.error(
    "UNHANDLED REJECTION! 💥 Shutting down...",
    err?.message || err
  );
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥", err);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully.");
  server.close(() => console.log("💥 Process terminated"));
});
