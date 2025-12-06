declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      firstName?: string;
      lastName?: string;
      hasBeenActive?: boolean;
      isActive?: boolean;
      [key: string]: any;
    }

    interface Request {
      user?: User;
      auth?: {
        sub: string; // JWT subject (user ID)
        email: string;
        role: string;
        iat?: number; // Issued at
        exp?: number; // Expiration
        iss?: string; // Issuer
        aud?: string; // Audience
        jti?: string; // JWT ID
        firstName?: string;
        lastName?: string;
        [key: string]: any;
      };
      requestId?: string;
      rawBody?: Buffer;
      id?: string;
    }
  }
}

export {};
