import proxy from "express-http-proxy";
import { Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export interface ProxyConfig {
  target: string;
  pathRewrite?: Record<string, string>;
  timeout?: number;
  isBackendService?: boolean;
}

export const createProxy = (config: ProxyConfig) => {
  const {
    target,
    pathRewrite,
    timeout = 30000,
    isBackendService = false,
  } = config;

  return proxy(target, {
    timeout,

    proxyReqPathResolver: (req) => {
      let newPath = req.url;
      if (pathRewrite) {
        for (const [pattern, replacement] of Object.entries(pathRewrite)) {
          const regex = new RegExp(pattern);
          newPath = newPath.replace(regex, replacement);
        }
      }
      return newPath;
    },

    parseReqBody: true,

    proxyReqOptDecorator: (proxyReqOpts, srcReq: Request) => {
      // Inject gateway secret for backend services
      if (isBackendService && env.GATEWAY_SECRET) {
        proxyReqOpts.headers = proxyReqOpts.headers || {};
        proxyReqOpts.headers["x-gateway-key"] = env.GATEWAY_SECRET;
      }

      // Forward cookies
      if (srcReq.headers.cookie) {
        proxyReqOpts.headers = proxyReqOpts.headers || {};
        proxyReqOpts.headers["cookie"] = srcReq.headers.cookie;
      }

      // Forward or create Authorization header from JWT cookie
      if (srcReq.headers.authorization) {
        proxyReqOpts.headers = proxyReqOpts.headers || {};
        proxyReqOpts.headers["authorization"] = srcReq.headers.authorization;
      } else if (srcReq.headers.cookie) {
        const jwtMatch = srcReq.headers.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
        if (jwtMatch && jwtMatch[1]) {
          proxyReqOpts.headers = proxyReqOpts.headers || {};
          proxyReqOpts.headers["authorization"] = `Bearer ${jwtMatch[1]}`;
        }
      }

      // Forward user context headers (this is the key part!)
      if (srcReq.user) {
        proxyReqOpts.headers = proxyReqOpts.headers || {};
        if (srcReq.user.id) {
          proxyReqOpts.headers["x-user-id"] = String(srcReq.user.id);
        }
        if (srcReq.user.email) {
          proxyReqOpts.headers["x-user-email"] = String(srcReq.user.email);
        }
        if (srcReq.user.role) {
          proxyReqOpts.headers["x-user-role"] = String(srcReq.user.role);
        }

        logger.debug("✅ Forwarding user headers:", {
          "x-user-id": srcReq.user.id,
          "x-user-email": srcReq.user.email,
          "x-user-role": srcReq.user.role,
        });
      } else {
        logger.warn("⚠️ No user found in request - headers not forwarded");
      }

      return proxyReqOpts;
    },

    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      return proxyResData;
    },

    proxyErrorHandler: (err, res: Response, next) => {
      logger.error("Proxy error", {
        target,
        error: err?.message || String(err),
      });

      if (!res.headersSent) {
        res.status(503).json({
          status: "error",
          message: "Upstream service unavailable",
          service: target,
          error: err?.message,
        });
      }
    },
  });
};
