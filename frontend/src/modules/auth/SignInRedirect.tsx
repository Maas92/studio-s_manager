import { useEffect } from "react";
import { useAuth } from "./AuthContext";

export default function SignInRedirect() {
  const { signIn } = useAuth();
  useEffect(() => {
    signIn();
  }, [signIn]);
  return null;
}
