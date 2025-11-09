import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { Request, Response } from "express";
import { logger } from "../utils/logger.js";

export interface ProxyConfig {
  target: string;
  pathRewrite?: Record<string, string>;
  timeout?: number;
}

export const createProxy = (config: ProxyConfig) => {
  const { target, pathRewrite, timeout = 30000 } = config;

  const options: Options = {
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: timeout,
    timeout,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req: any) => {
        // Add correlation ID
        if (req.requestId) {
          proxyReq.setHeader("X-Request-ID", req.requestId);
        }

        // Add user context from JWT
        if (req.auth) {
          const { sub, email, role, firstName, lastName } = req.auth;
          if (sub) proxyReq.setHeader("X-User-Id", String(sub));
          if (email) proxyReq.setHeader("X-User-Email", String(email));
          if (role) proxyReq.setHeader("X-User-Role", String(role));
          if (firstName)
            proxyReq.setHeader("X-User-FirstName", String(firstName));
          if (lastName) proxyReq.setHeader("X-User-LastName", String(lastName));
        }

        // Remove sensitive headers
        proxyReq.removeHeader("cookie");

        logger.debug("Proxying request", {
          target,
          path: req.path,
          method: req.method,
          requestId: req.requestId,
        });
      },

      proxyRes: (proxyRes, req: any) => {
        logger.debug("Proxy response received", {
          target,
          statusCode: proxyRes.statusCode,
          requestId: req.requestId,
        });
      },

      error: (err, req: any, res) => {
        const response = res as Response;

        logger.error("Proxy error", {
          target,
          error: err.message,
          requestId: req.requestId,
          path: req.path,
        });

        if (!response.headersSent) {
          response.status(503).json({
            status: "error",
            message: "Upstream service unavailable",
            service: target,
            requestId: req.requestId,
          });
        }
      },
    },
  };

  return createProxyMiddleware(options);
};
