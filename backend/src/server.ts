import http from "http";
import https from "https";
import fs from "fs";
import app from "./app.js";
import { env } from "./config/env.js";
import { testConnection, closePool } from "./config/database.js";
import { logger } from "./utils/logger.js";

const httpPort = env.PORT; // Main port for API Gateway (HTTP)
const mtlsPort = process.env.MTLS_PORT || 5003; // Separate port for mTLS

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
      logger.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    const servers: (http.Server | https.Server)[] = [];

    // 1. Always start HTTP server for API Gateway
    const httpServer = http.createServer(app);
    const host =
      process.env.NODE_ENV === "production" ? "backend" : "localhost";

    httpServer.listen(httpPort, () => {
      logger.info(`🚀 Backend HTTP Server running on port ${httpPort}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API: http://${host}:${httpPort}/api/v1`);
      logger.info(`❤️  Health: http://${host}:${httpPort}/health`);
    });

    servers.push(httpServer);

    // 2. Optionally start HTTPS server with mTLS on different port
    const mtlsEnabled = process.env.ENABLE_MTLS === "true";

    if (mtlsEnabled) {
      logger.info("🔒 mTLS enabled - creating HTTPS server on separate port");

      try {
        // Load certificates for mTLS
        const certPath =
          process.env.BACKEND_MTLS_CERT || "./certs/backend-cert.pem";
        const keyPath =
          process.env.BACKEND_MTLS_KEY || "./certs/backend-key.pem";
        const caPath = process.env.BACKEND_CA_CERT || "./certs/ca-cert.pem";

        // Verify files exist
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
          requestCert: true, // Request client certificate
          rejectUnauthorized: true, // Reject invalid certificates
        };

        logger.info("✅ Certificates loaded successfully");
        logger.info(`   Cert: ${certPath}`);
        logger.info(`   Key: ${keyPath}`);
        logger.info(`   CA: ${caPath}`);

        const httpsServer = https.createServer(httpsOptions, app);

        httpsServer.listen(mtlsPort, () => {
          logger.info(
            `🔒 Backend HTTPS Server (mTLS) running on port ${mtlsPort}`
          );
          logger.info(`🔗 mTLS API: https://${host}:${mtlsPort}/api/v1`);
          logger.info(`🔐 Client certificates required for this port`);
        });

        servers.push(httpsServer);
      } catch (error) {
        logger.error("Failed to setup mTLS:", error);
        logger.warn("⚠️  mTLS server not started - continuing with HTTP only");
      }
    } else {
      logger.info("🌐 mTLS disabled - only HTTP server running");
    }

    /**
     * Graceful shutdown handler
     */
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      // Close all servers
      const closePromises = servers.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => {
              logger.info("✅ Server closed");
              resolve();
            });
          })
      );

      await Promise.all(closePromises);

      try {
        await closePool();
        logger.info("✅ Database connections closed");
        logger.info("👋 Graceful shutdown completed");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown:", err);
        process.exit(1);
      }

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error("⚠️  Forcing shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    // Handle process termination signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: Error, promise: Promise<any>) => {
      logger.error("🚨 UNHANDLED REJECTION! Shutting down...");
      logger.error("Reason:", reason);
      logger.error("Promise:", promise);
      gracefulShutdown("UNHANDLED_REJECTION");
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err: Error) => {
      logger.error("🚨 UNCAUGHT EXCEPTION! Shutting down...");
      logger.error("Error:", err.name, err.message);
      logger.error("Stack:", err.stack);
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
