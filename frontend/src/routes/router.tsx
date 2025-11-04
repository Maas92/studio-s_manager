import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout.js";
import Dashboard from "../modules/dashboard/Dashboard";
import Products from "../modules/products/Products";
import Stock from "../modules/stock/Stock";
import Treatments from "../modules/treatments/Treatments";
import Clients from "../modules/clients/Clients";
import Appointments from "../modules/appointments/Appointments";
import { Protected } from "../modules/auth/Protected.js";
import AuthCallback from "../modules/auth/AuthCallback";
import SignInRedirect from "../modules/auth/SignInRedirect";
import NotFound from "../ui/NotFound.js";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "products", element: <Products /> },
      { path: "stock", element: <Stock /> },
      { path: "treatments", element: <Treatments /> },
      { path: "clients", element: <Clients /> },
      { path: "appointments", element: <Appointments /> },
      // 👇 catch-all for unknown routes inside the app shell
      { path: "*", element: <NotFound /> },
    ],
  },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/login", element: <SignInRedirect /> },
  { path: "*", element: <Navigate to="/" replace /> },
  // 👇 top-level fallback (unknown public routes)
  { path: "*", element: <NotFound /> },
]);
