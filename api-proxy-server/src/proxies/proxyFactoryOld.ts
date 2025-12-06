import {
  createProxyMiddleware,
  Options as ProxyOptions,
} from "http-proxy-middleware";
import type { ClientRequest, IncomingMessage, ServerResponse } from "http";
import { Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export interface ProxyConfig {
  target: string;
  pathRewrite?: Record<string, string>;
  timeout?: number;
  isBackendService?: boolean; // Flag to add GATEWAY_SECRET
}

const HOP_BY_HOP_REQUEST = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
]);

const HOP_BY_HOP_RESPONSE = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

export const createProxy = (config: ProxyConfig) => {
  const {
    target,
    pathRewrite,
    timeout = 30000,
    isBackendService = false,
  } = config;

  const options = {
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: timeout,
    timeout,
    pathRewrite,
    parseReqBody: false,
    preserveHeaderKeyCase: true,

    /**
     * onProxyReq runs right before the upstream request is sent.
     * We:
     *  - remove hop-by-hop request headers
     *  - inject gateway secret header for backend services
     *  - forward cookies and authorization
     *  - forward user context headers if present
     *  - restream parsed JSON body (if any)
     *  - debug-log outgoing headers
     */
    onProxyReq: (proxyReq: ClientRequest, req: Request, res: Response) => {
      try {
        // Remove hop-by-hop headers
        HOP_BY_HOP_REQUEST.forEach((h) => {
          try {
            if (typeof proxyReq.removeHeader === "function")
              proxyReq.removeHeader(h);
          } catch (_) {}
        });

        // Inject gateway secret for backend services
        if (isBackendService && env.GATEWAY_SECRET) {
          proxyReq.setHeader("x-gateway-key", env.GATEWAY_SECRET);
        }

        // Forward cookies
        if (req.headers && req.headers.cookie) {
          proxyReq.setHeader("cookie", req.headers.cookie);
        }

        // Forward or create Authorization header
        const incomingAuth = req.get && req.get("authorization");
        if (incomingAuth && incomingAuth.startsWith("Bearer ")) {
          proxyReq.setHeader("authorization", incomingAuth);
        } else {
          const cookieHeader: string =
            (req.headers && req.headers.cookie) || "";
          const jwtMatch = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
          if (jwtMatch && jwtMatch[1]) {
            proxyReq.setHeader("authorization", `Bearer ${jwtMatch[1]}`);
          }
        }

        // Forward user context headers
        if (req.user) {
          if (req.user.id) proxyReq.setHeader("x-user-id", String(req.user.id));
          if (req.user.email)
            proxyReq.setHeader("x-user-email", String(req.user.email));
          if (req.user.role)
            proxyReq.setHeader("x-user-role", String(req.user.role));
        }

        logger.debug("Proxying request", {
          target,
          path: req.path,
          method: req.method,
          requestId: req.requestId ?? req.id,
          isBackendService,
        });
      } catch (err) {
        logger.error("onProxyReq unexpected error", {
          error: (err as Error).message,
        });
      }
    },

    onProxyReqBody: (
      bodyContent: any,
      srcReq: Request,
      proxyReq: ClientRequest
    ) => {
      // This is called by http-proxy-middleware when parseReqBody is false
      // It handles writing the body properly
      try {
        if (srcReq.body && Object.keys(srcReq.body).length > 0) {
          const bodyData = JSON.stringify(srcReq.body);
          proxyReq.setHeader("Content-Type", "application/json");
          proxyReq.setHeader(
            "Content-Length",
            Buffer.byteLength(bodyData).toString()
          );
          return bodyData;
        }
      } catch (err) {
        logger.error("onProxyReqBody error", { error: (err as Error).message });
      }
    },

    /**
     * onProxyRes runs when upstream responds.
     * We:
     *  - preserve Set-Cookie (optionally strip Secure for local dev)
     *  - forward safe headers (filter hop-by-hop)
     *  - log proxy response
     */
    onProxyRes: (proxyRes: any, req: Request, res: Response) => {
      try {
        // Handle Set-Cookie carefully – preserve multiple cookies
        const setCookie = proxyRes.headers && proxyRes.headers["set-cookie"];
        if (setCookie) {
          const rewritten = Array.isArray(setCookie)
            ? setCookie.map((c: string) =>
                env.NODE_ENV === "development"
                  ? c.replace(/; ?secure/gi, "")
                  : c
              )
            : env.NODE_ENV === "development"
            ? String(setCookie).replace(/; ?secure/gi, "")
            : setCookie;
          res.setHeader("set-cookie", rewritten);
        }

        // Forward other safe headers (avoid hop-by-hop headers)
        Object.keys(proxyRes.headers || {}).forEach((key) => {
          const lower = key.toLowerCase();
          if (lower === "set-cookie") return;
          if (HOP_BY_HOP_RESPONSE.has(lower)) return;
          const value = proxyRes.headers[key];
          if (value !== undefined) {
            res.setHeader(key, value);
          }
        });

        logger.debug("Proxy response received", {
          target,
          statusCode: proxyRes.statusCode,
          requestId: req.requestId ?? req.id,
        });
      } catch (err) {
        logger.warn("onProxyRes handler error", {
          error: (err as Error).message,
        });
      }
    },

    /**
     * onError: handle proxy errors and return a friendly json error to callers.
     */
    onError: (err: any, req: any, res: Response) => {
      logger.error("Proxy error", {
        target,
        error: err?.message || err,
        requestId: req.requestId ?? req.id,
        path: req.path,
      });

      if (!res.headersSent) {
        try {
          res.status(503).json({
            status: "error",
            message: "Upstream service unavailable",
            service: target,
            requestId: req.requestId ?? req.id,
          });
        } catch (e) {
          // if json response fails, fallback to plain text
          try {
            res.status(503).send("Upstream service unavailable");
          } catch (_) {
            // nothing else to do
          }
        }
      }
    },
  };

  return createProxyMiddleware(options);
};
