import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { AuthContext, type AuthState, type User } from "./AuthContext";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/auth/me");
        const maybeUser =
          (res as any).data?.data?.user ?? (res as any).data ?? null;
        setUser(maybeUser);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Sign in method
  const signIn = async (email: string, password: string) => {
    await api.post("/auth/login", { email, password });
    const me = await api.get("/auth/me");
    const maybeUser = (me as any).data?.data?.user ?? (me as any).data ?? null;
    setUser(maybeUser);
  };

  // Sign out method
  const signOut = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      // Optional: handle redirect outside provider to avoid Fast Refresh issues
      // window.location.href = "/login";
    }
  };

  const hasRole = (role: string) => user?.role === role;

  // Memoize value to prevent unnecessary re-renders
  const value: AuthState = useMemo(
    () => ({ user, loading, signIn, signOut, hasRole }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
