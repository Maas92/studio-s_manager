import React, { useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import api from "../../services/api";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
  const { setUser } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        // maybe you have code param -> exchange at /auth/callback
        const code = searchParams.get("code");
        // For your app: call gateway endpoint to finish login, or if tokens are in cookies the backend may set them
        const res = await api.post("/auth/callback", { code });
        // fetch /auth/me or set user from response
        const me = await api.get("/auth/me");
        setUser(me.data.data.user);
        navigate("/dashboard");
      } catch (err) {
        navigate("/login");
      }
    }
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div>Signing you in...</div>;
}
