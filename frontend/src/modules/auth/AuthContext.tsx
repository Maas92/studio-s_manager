import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../../services/api";

export type User = { id: string; name: string; email: string; roles: string[] };

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const AuthCtx = createContext<AuthState | null>(null);

const LOGIN_URL = import.meta.env.VITE_AUTH_LOGIN_URL as string;
const LOGOUT_URL = import.meta.env.VITE_AUTH_LOGOUT_URL as string;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<User>("/auth/me");
        setUser(data);
      } catch (_) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = () => {
    const url = new URL(LOGIN_URL);
    url.searchParams.set(
      "redirect_uri",
      window.location.origin + "/auth/callback"
    );
    window.location.href = url.toString();
  };

  const signOut = async () => {
    await api.post("/auth/logout");
    window.location.href = LOGOUT_URL || "/";
  };

  const hasRole = (role: string) => !!user?.roles?.includes(role);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, hasRole }),
    [user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
