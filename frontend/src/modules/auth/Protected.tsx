import React, { useEffect } from "react";
import { useAuth } from "./AuthContext";

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuth();

  useEffect(() => {
    if (!loading && !user) signIn();
  }, [loading, user, signIn]);

  if (loading || !user) return null;
  return <>{children}</>;
}
