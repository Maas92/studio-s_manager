import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";

const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
  console.log(`🚀 API Gateway running on port ${port}`);
  console.log(`📍 Auth Service: ${process.env.AUTH_SERVICE_URL}`);
  console.log(`📍 Inventory Service: ${process.env.INVENTORY_SERVICE_URL}`);
});

process.on("unhandledRejection", (err: Error) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
