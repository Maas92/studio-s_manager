import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../services/api";
import { AuthContext, type AuthState, type User } from "./AuthContext";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch current user on mount
   * This will fail with 401 if not authenticated - that's expected
   */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/auth/me");
        const maybeUser =
          (res as any).data?.data?.user ??
          (res as any).data?.user ??
          (res as any).data ??
          null;
        setUser(maybeUser);
      } catch (err: any) {
        // 401 is expected when not logged in - don't log it
        if (err?.response?.status !== 401) {
          console.error("[AuthProvider] Failed to fetch user:", err);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Sign in method
   * Cookies are automatically sent/stored by the browser
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Login endpoint sets the auth cookie
      await api.post("/auth/login", { email, password });

      // Fetch user data after successful login
      const me = await api.get("/auth/me");
      const maybeUser =
        (me as any).data?.data?.user ??
        (me as any).data?.user ??
        (me as any).data ??
        null;

      setUser(maybeUser);
    } catch (err: any) {
      console.error("[AuthProvider] Sign in failed:", err);
      throw err; // Re-throw so the login form can handle it
    }
  }, []);

  /**
   * Sign out method
   * Clears the auth cookie on the server
   */
  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("[AuthProvider] Logout request failed:", err);
    } finally {
      setUser(null);
      // Optionally redirect to login page
      // window.location.href = "/login";
    }
  }, []);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((role: string) => user?.role === role, [user]);

  /**
   * Memoize context value to prevent unnecessary re-renders
   */
  const value: AuthState = useMemo(
    () => ({ user, loading, signIn, signOut, hasRole }),
    [user, loading, signIn, signOut, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
