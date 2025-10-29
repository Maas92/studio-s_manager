const app = require("./app");
import { pool } from "./config/database";

const port = process.env.PORT || 4001;

// Test database connection
pool.query("SELECT NOW()", (err: any, res: { rows: { now: any }[] }) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  console.log("✅ PostgreSQL connected successfully at:", res.rows[0].now);
});

const server = app.listen(port, () => {
  console.log(`🚀 Inventory Service running on port ${port}`);
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
