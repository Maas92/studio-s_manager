export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  accessToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface ErrorResponse {
  status: "error" | "fail";
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface SuccessResponse<T = any> {
  status: "success";
  data?: T;
  message?: string;
}
