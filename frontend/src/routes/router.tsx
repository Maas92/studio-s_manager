import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout.js";
import Dashboard from "../modules/dashboard/Dashboard";
import Stock from "../modules/stock/Stock";
import Treatments from "../modules/treatments/Treatments";
import Clients from "../modules/clients/Clients";
import Appointments from "../modules/appointments/Appointments";
import { Protected } from "../modules/auth/Protected.js";
import AuthCallback from "../modules/auth/AuthCallback";
import SignInRedirect from "../modules/auth/SignInRedirect";
import NotFound from "../ui/NotFound.js";
import Staff from "../modules/staff/Staff.js";
import POS from "../modules/POS/POS";

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
      { path: "stock", element: <Stock /> },
      { path: "pos", element: <POS /> },
      { path: "treatments", element: <Treatments /> },
      { path: "clients", element: <Clients /> },
      { path: "staff", element: <Staff /> },
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
