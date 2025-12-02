import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../../services/api";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Check if user is already authenticated on mount
  useEffect(() => {
    (async () => {
      try {
        // Try to get current user
        const { data } = await api.get<User>("/auth/me");
        setUser(data);
      } catch (error) {
        console.error("Not authenticated:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Call login endpoint
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });
      // The API should set httpOnly cookies automatically
      // Now fetch the user data
      const { data: userData } = await api.get<User>("/auth/me");
      setUser(userData);
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(
        error.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  const signOut = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      // Optionally redirect to login page
      window.location.href = "/login";
    }
  };

  const hasRole = (role: string) => user?.role === role;
  const value = useMemo(
    () => ({ user, loading, signIn, signOut, hasRole }),
    [user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
