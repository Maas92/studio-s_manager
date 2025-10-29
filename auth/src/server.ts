import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

import app from "./app.js";

const DB = (process.env.DATABASE || "").replace(
  "<db_password>",
  process.env.DATABASE_PASSWORD || ""
);

mongoose.connect(DB).then(() => console.log("DB connection successful!"));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  if (err instanceof Error) {
    console.log(err.name, err.message);
  } else {
    console.log("Unknown error", err);
  }
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
