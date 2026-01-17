import http from "http";
import https from "https";
import fs from "fs";
import app from "./app.js";
import { env } from "./config/env.js";
import { testConnection, closePool } from "./config/database.js";
import { logger } from "./utils/logger.js";

const httpPort = env.PORT; // Main port for API Gateway (HTTP)
const mtlsPort = Number(process.env.MTLS_PORT) || 5003; // Separate port for mTLS

/**
 * Start the server with dual ports:
 * - HTTP for API Gateway and regular traffic
 * - HTTPS with mTLS for Google Contacts service (if enabled)
 */
async function startServer() {
  try {
    // Test database connection before starting server
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error("❌ Failed to connect to database. Exiting...");
      process.exit(1);
    }

    const servers: Array<http.Server | https.Server> = [];

    /**
     * 1️⃣ HTTP server (always enabled)
     */
    const httpServer = http.createServer(app);
    const host =
      process.env.NODE_ENV === "production" ? "backend" : "localhost";

    httpServer.listen(httpPort, () => {
      logger.info("🚀 Backend HTTP Server started");
      logger.info(
        {
          port: httpPort,
          env: env.NODE_ENV,
          api: `http://${host}:${httpPort}/api/v1`,
          health: `http://${host}:${httpPort}/health`,
        },
        "HTTP server listening"
      );
    });

    servers.push(httpServer);

    /**
     * 2️⃣ Optional HTTPS server with mTLS
     */
    const mtlsEnabled = process.env.ENABLE_MTLS === "true";

    if (mtlsEnabled) {
      logger.info("🔒 mTLS enabled — starting HTTPS server");

      try {
        const certPath =
          process.env.BACKEND_MTLS_CERT || "./certs/backend-cert.pem";
        const keyPath =
          process.env.BACKEND_MTLS_KEY || "./certs/backend-key.pem";
        const caPath = process.env.BACKEND_CA_CERT || "./certs/ca-cert.pem";

        if (!fs.existsSync(certPath)) {
          throw new Error(`Certificate not found: ${certPath}`);
        }
        if (!fs.existsSync(keyPath)) {
          throw new Error(`Private key not found: ${keyPath}`);
        }
        if (!fs.existsSync(caPath)) {
          throw new Error(`CA certificate not found: ${caPath}`);
        }

        const httpsOptions = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
          ca: fs.readFileSync(caPath),
          requestCert: true,
          rejectUnauthorized: true,
        };

        logger.info(
          { certPath, keyPath, caPath },
          "✅ mTLS certificates loaded"
        );

        const httpsServer = https.createServer(httpsOptions, app);

        httpsServer.listen(mtlsPort, () => {
          logger.info(
            {
              port: mtlsPort,
              api: `https://${host}:${mtlsPort}/api/v1`,
            },
            "🔐 HTTPS mTLS server listening"
          );
        });

        servers.push(httpsServer);
      } catch (error) {
        logger.error({ error }, "❌ Failed to setup mTLS server");
        logger.warn("⚠️  Continuing with HTTP only");
      }
    } else {
      logger.info("🌐 mTLS disabled — HTTP only");
    }

    /**
     * Graceful shutdown handler
     */
    const gracefulShutdown = async (signal: string) => {
      logger.info({ signal }, "🛑 Shutdown signal received");

      const shutdownTimer = setTimeout(() => {
        logger.error("⏰ Forced shutdown after timeout");
        process.exit(1);
      }, 10_000);

      try {
        await Promise.all(
          servers.map(
            (server) =>
              new Promise<void>((resolve) => {
                server.close(() => {
                  logger.info("✅ Server closed");
                  resolve();
                });
              })
          )
        );

        await closePool();
        logger.info("✅ Database connections closed");

        clearTimeout(shutdownTimer);
        logger.info("👋 Graceful shutdown completed");
        process.exit(0);
      } catch (err) {
        logger.error({ err }, "❌ Error during graceful shutdown");
        process.exit(1);
      }
    };

    /**
     * Process-level safety handlers
     */
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error({ reason }, "🚨 Unhandled promise rejection");
      gracefulShutdown("UNHANDLED_REJECTION");
    });

    process.on("uncaughtException", (err) => {
      logger.error(
        { err },
        "🚨 Uncaught exception — shutting down immediately"
      );
      process.exit(1);
    });
  } catch (error) {
    logger.error({ error }, "❌ Failed to start server");
    process.exit(1);
  }
}

// Start the server
startServer();
