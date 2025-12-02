import { Request, Response, NextFunction } from "express";

export const cookieDebugMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("\n=== COOKIE DEBUG ===");
  console.log("Path:", req.path);
  console.log("Method:", req.method);
  console.log("Cookie header:", req.headers.cookie);
  console.log("Parsed cookies:", req.cookies);
  console.log("===================\n");

  // Intercept res.setHeader to log Set-Cookie
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function (name: string, value: any) {
    if (name.toLowerCase() === "set-cookie") {
      console.log("\n🍪 SET-COOKIE BEING SET:");
      console.log(value);
      console.log("🍪 END SET-COOKIE\n");
    }
    return originalSetHeader(name, value);
  };

  next();
};
