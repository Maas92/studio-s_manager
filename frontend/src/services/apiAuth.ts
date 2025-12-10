import type { AuthResponse, LoginCredentials, User } from "../types";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export async function login({
  email,
  password,
}: LoginCredentials): Promise<User> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Login failed");
  }

  const data: AuthResponse = await res.json();

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.data.user));

  return data.data.user;
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem("token");

  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getCurrentUser(): User | null {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}
