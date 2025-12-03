import { createContext, useContext } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

// Create context (initially null)
export const AuthContext = createContext<AuthState | null>(null);

// Custom hook for consuming the context
export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
