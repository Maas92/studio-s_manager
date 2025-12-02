import React, { useEffect } from "react";
import { useAuth } from "./AuthContext";
import Spinner from "../../ui/components/Spinner";
import { Navigate } from "react-router-dom";

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
