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

    proxyReqPathResolver: (req: Request) => {
      let newPath = `${req.baseUrl}${req.url}`;

      if (pathRewrite) {
        for (const [pattern, replacement] of Object.entries(pathRewrite)) {
          newPath = newPath.replace(new RegExp(pattern), replacement);
        }
      }

      logger.debug(
        {
          method: req.method,
          originalPath: `${req.baseUrl}${req.url}`,
          newPath,
          target,
          requestId: req.requestId,
        },
        "🔁 Proxying request"
      );

      return newPath;
    },

    parseReqBody: true,

    proxyReqOptDecorator: (proxyReqOpts, srcReq: Request) => {
      proxyReqOpts.headers = proxyReqOpts.headers || {};

      // 🔐 Inject gateway secret for backend services
      if (isBackendService && env.GATEWAY_SECRET) {
        proxyReqOpts.headers["x-gateway-key"] = env.GATEWAY_SECRET;
      }

      // 🍪 Forward cookies
      if (srcReq.headers.cookie) {
        proxyReqOpts.headers["cookie"] = srcReq.headers.cookie;
      }

      // 🔑 Forward Authorization header or derive from JWT cookie
      if (srcReq.headers.authorization) {
        proxyReqOpts.headers["authorization"] = srcReq.headers.authorization;
      } else if (srcReq.headers.cookie) {
        const jwtMatch = srcReq.headers.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
        if (jwtMatch?.[1]) {
          proxyReqOpts.headers["authorization"] = `Bearer ${jwtMatch[1]}`;
        }
      }

      // 👤 Forward authenticated user context
      if (srcReq.user) {
        if (srcReq.user.id) {
          proxyReqOpts.headers["x-user-id"] = String(srcReq.user.id);
        }
        if (srcReq.user.email) {
          proxyReqOpts.headers["x-user-email"] = String(srcReq.user.email);
        }
        if (srcReq.user.role) {
          proxyReqOpts.headers["x-user-role"] = String(srcReq.user.role);
        }

        logger.debug(
          {
            userId: srcReq.user.id,
            role: srcReq.user.role,
            requestId: srcReq.requestId,
          },
          "✅ Forwarding user context headers"
        );
      } else {
        logger.warn(
          {
            requestId: srcReq.requestId,
            target,
          },
          "⚠️ No authenticated user found — user headers not forwarded"
        );
      }

      return proxyReqOpts;
    },

    userResDecorator: (_proxyRes, proxyResData) => {
      return proxyResData;
    },

    proxyErrorHandler: (err, res: Response) => {
      logger.error(
        {
          err,
          target,
        },
        "🚨 Proxy request failed"
      );

      if (!res.headersSent) {
        res.status(503).json({
          status: "error",
          message: "Upstream service unavailable",
          service: target,
        });
      }
    },
  });
};
