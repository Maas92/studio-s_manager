import type { Appointment } from "../modules/appointments/AppointmentsSchema";

export function calculateAppointmentStats(
  appointments: Appointment[],
  filterId?: string,
  filterType?: "client" | "staff" | "treatment"
) {
  const filtered = filterId
    ? appointments.filter((a) => {
        if (filterType === "client") return a.clientId === filterId;
        if (filterType === "staff") return a.staffId === filterId;
        if (filterType === "treatment") return a.treatmentId === filterId;
        return true;
      })
    : appointments;

  const completed = filtered.filter((a) => a.status === "completed");
  const cancelled = filtered.filter((a) => a.status === "cancelled");
  const noShow = filtered.filter((a) => a.status === "no_show");
  const upcoming = filtered.filter(
    (a) =>
      new Date(a.datetimeISO).getTime() >= Date.now() &&
      a.status === "confirmed"
  );

  const totalRevenue = completed.reduce(
    (sum, appt) => sum + (appt.price || 0),
    0
  );

  const uniqueClients = new Set(filtered.map((a) => a.clientId)).size;

  const cancellationRate =
    filtered.length > 0 ? (cancelled.length / filtered.length) * 100 : 0;

  const noShowRate =
    filtered.length > 0 ? (noShow.length / filtered.length) * 100 : 0;

  return {
    total: filtered.length,
    completed: completed.length,
    cancelled: cancelled.length,
    noShow: noShow.length,
    upcoming: upcoming.length,
    totalRevenue,
    uniqueClients,
    cancellationRate,
    noShowRate,
    revenuePerAppointment:
      completed.length > 0 ? totalRevenue / completed.length : 0,
  };
}

export function calculateUtilizationRate(
  hoursWorked: number,
  availableHours: number = 160 // Default to 40hrs/week * 4 weeks
): number {
  return (hoursWorked / availableHours) * 100;
}

export function getVariantByThreshold(
  value: number,
  successThreshold: number,
  warningThreshold: number
): "success" | "warning" | "danger" {
  if (value >= successThreshold) return "success";
  if (value >= warningThreshold) return "warning";
  return "danger";
}
