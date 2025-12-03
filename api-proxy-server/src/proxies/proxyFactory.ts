import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export interface ProxyConfig {
  target: string;
  pathRewrite?: Record<string, string>;
  timeout?: number;
  isBackendService?: boolean; // Flag to add GATEWAY_SECRET
}

export const createProxy = (config: ProxyConfig) => {
  const { target, pathRewrite, timeout = 30000, isBackendService = false } = config;

  const options: Options = {
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: timeout,
    timeout,
    pathRewrite,

    onProxyReq: (proxyReq, req: any, res: Response) => {
      // CRITICAL: Add GATEWAY_SECRET for backend service verification
      if (isBackendService && env.GATEWAY_SECRET) {
        proxyReq.setHeader("x-gateway-key", env.GATEWAY_SECRET);
      }

      // Forward client's cookie header to backend so backend sees jwt cookie
      if (req.headers.cookie) {
        proxyReq.setHeader("cookie", req.headers.cookie);
      }

      // If gateway already has authorization header, forward it
      const incomingAuth = req.get && req.get("authorization");
      if (incomingAuth && incomingAuth.startsWith("Bearer ")) {
        proxyReq.setHeader("authorization", incomingAuth);
      } else {
        // Try to extract jwt cookie and forward as Authorization header
        const cookieHeader = req.headers.cookie || "";
        const jwtMatch = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
        if (jwtMatch && jwtMatch[1]) {
          proxyReq.setHeader("authorization", `Bearer ${jwtMatch[1]}`);
        }
      }

      // Forward any user context headers the gateway attached
      if (req.user) {
        if (req.user.id) proxyReq.setHeader("x-user-id", String(req.user.id));
        if (req.user.email)
          proxyReq.setHeader("x-user-email", String(req.user.email));
        if (req.user.role)
          proxyReq.setHeader("x-user-role", String(req.user.role));
      }

      // Restream parsed JSON body, if present
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
        proxyReq.end();
      }

      logger.debug("Proxying request", {
        target,
        path: req.path,
        method: req.method,
        requestId: req.requestId,
        hasGatewaySecret: isBackendService,
      });
    },

    onProxyRes: (proxyRes, req: any, res: Response) => {
      // Handle Set-Cookie carefully – preserve multiple cookies
      const setCookie = proxyRes.headers["set-cookie"];
      if (setCookie) {
        // Optionally remove Secure when running plain http in development.
        // In production (env.NODE_ENV === 'production') keep Secure flag.
        const rewritten = setCookie.map((c: string) =>
          env.NODE_ENV === "development" ? c.replace(/; ?secure/gi, "") : c
        );
        res.setHeader("set-cookie", rewritten);
      }

      // Forward other safe headers (avoid hop-by-hop headers)
      const hopByHop = new Set([
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
      ]);

      Object.keys(proxyRes.headers).forEach((key) => {
        const lower = key.toLowerCase();
        if (lower === "set-cookie") return;
        if (hopByHop.has(lower)) return;
        const value = proxyRes.headers[key];
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      });

      logger.debug("Proxy response received", {
        target,
        statusCode: proxyRes.statusCode,
        requestId: req.requestId,
      });
    },

    onError: (err, req: any, res: Response) => {
      logger.error("Proxy error", {
        target,
        error: err?.message,
        requestId: req.requestId,
        path: req.path,
      });

      if (!res.headersSent) {
        res.status(503).json({
          status: "error",
          message: "Upstream service unavailable",
          service: target,
          requestId: req.requestId,
        });
      }
    },
  };

  return createProxyMiddleware(options);
};