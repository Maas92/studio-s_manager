import app from "./app";
import { pool } from "./config/database";

const port = process.env.PORT || 4001;

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  console.log("✅ PostgreSQL connected successfully at:", res.rows[0].now);
});

const server = app.listen(port, () => {
  console.log(`🚀 Backend Service running on port ${port}`);
});

process.on("unhandledRejection", (err: Error) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", async () => {
  await pool.end();
  server.close();
});
process.on("SIGINT", async () => {
  await pool.end();
  server.close();
});
