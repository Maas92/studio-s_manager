import api from "../../services/api";

export type DashboardSummary = {
  productCount: number;
  stockItems: number;
  treatmentCount: number;
  clientCount: number;
  appointmentCount: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const { data } = await api.get("/dashboard/summary");
    const s = data ?? {};
    return {
      productCount: Number(s.productCount ?? 0),
      stockItems: Number(s.stockItems ?? 0),
      treatmentCount: Number(s.treatmentCount ?? 0),
      clientCount: Number(s.clientCount ?? 0),
      appointmentCount: Number(s.appointmentCount ?? 0),
    };
  } catch {
    return {
      productCount: 0,
      stockItems: 0,
      treatmentCount: 0,
      clientCount: 0,
      appointmentCount: 0,
    };
  }
}
