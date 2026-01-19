import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout.js";
import Dashboard from "../modules/dashboard/Dashboard";
import Stock from "../modules/stock/Stock";
import Treatments from "../modules/treatments/Treatments";
import Clients from "../modules/clients/Clients";
import Appointments from "../modules/appointments/Appointments";
import { Protected } from "../modules/auth/Protected.js";
import AuthCallback from "../modules/auth/AuthCallback";
import Login from "../modules/login/Login";
import NotFound from "../ui/NotFound.js";
import Staff from "../modules/staff/Staff";
import POS from "../modules/POS/POS";
import CashUp from "../modules/cashup/CashUp";
import OutboxManager from "../modules/outbox/Admin.js";

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
      { path: "cashup", element: <CashUp /> },
      { path: "outbox", element: <OutboxManager /> },
      // 👇 catch-all for unknown routes inside the app shell
      { path: "*", element: <NotFound /> },
    ],
  },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/login", element: <Login /> },
  { path: "*", element: <Navigate to="/" replace /> },
  // 👇 top-level fallback (unknown public routes)
  { path: "*", element: <NotFound /> },
]);
