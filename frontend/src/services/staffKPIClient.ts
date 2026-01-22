import { createResourceClient } from "../services/resourceFactory";
import api from "../services/api";
import { unwrapResponse } from "../utils/unwrapResponse";
import {
  StaffKPISchema,
  CreateStaffKPISchema,
  type StaffKPI,
  type CreateStaffKPIInput,
} from "../modules/staff/StaffSchema";

// Create the base resource client
const baseClient = createResourceClient<StaffKPI, CreateStaffKPIInput>({
  basePath: "/staff/kpis",
  schema: StaffKPISchema,
  createSchema: CreateStaffKPISchema,
});

// Custom methods that extend the base client
async function listByStaffId(staffId: string): Promise<StaffKPI[]> {
  const response = await api.get(`/staff/${staffId}/kpis`);
  const data = unwrapResponse(response);
  if (!data) return [];

  // Check if data is wrapped in a kpis property
  if (typeof data === "object" && "kpis" in data && Array.isArray(data.kpis)) {
    return data.kpis;
  }

  // If it's already an array, return it
  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

async function getSummary(
  staffId: string,
  year: number,
): Promise<{ month: string; totalScore: number; status: string }[]> {
  const response = await api.get(`/staff/${staffId}/kpis/summary?year=${year}`);
  const data = unwrapResponse(response);
  if (!data) return [];

  // Check if data is wrapped in a summary property
  if (
    typeof data === "object" &&
    "summary" in data &&
    Array.isArray(data.summary)
  ) {
    return data.summary;
  }

  // If it's already an array, return it
  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

// Export the combined client
export const staffKPIClient = {
  ...baseClient,
  listByStaffId,
  getSummary,
};

// Export types
export type { StaffKPI, CreateStaffKPIInput };
