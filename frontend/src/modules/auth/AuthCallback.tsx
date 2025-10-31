import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code)
          await api.post("/auth/callback", {
            code,
            redirectUri: window.location.origin + "/auth/callback",
          });
        await api.get("/auth/me");
        navigate("/", { replace: true });
      } catch (e) {
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  return null;
}
