import api from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";
import { mockStaff } from "./mockStaff";

// Schemas
export const StaffPerformanceSchema = z.object({
  staffId: z.string(),
  period: z.string(), // e.g., "2024-11" for November 2024
  appointmentsCompleted: z.number(),
  appointmentsCancelled: z.number(),
  totalRevenue: z.number(),
  averageRating: z.number().optional(),
  totalHoursWorked: z.number().optional(),
  utilizationRate: z.number().optional(), // Percentage of available hours booked
  clientRetentionRate: z.number().optional(), // Percentage of returning clients
  noShowRate: z.number().optional(),
});

export const StaffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string(),
  specializations: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
  hireDate: z.string().optional(),
  bio: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  schedule: z.record(z.string(), z.string()).optional(), // e.g., { "monday": "9am-5pm" }
  avatar: z.string().optional(),
  performance: StaffPerformanceSchema.optional(),
});

export const CreateStaffMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  specializations: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  hireDate: z.string().optional(),
  bio: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  schedule: z.record(z.string(), z.string()).optional(),
});

// Types
export type StaffPerformance = z.infer<typeof StaffPerformanceSchema>;
export type StaffMember = z.infer<typeof StaffMemberSchema>;
export type CreateStaffMemberInput = z.infer<typeof CreateStaffMemberSchema>;

const USE_MOCK_DATA = true;

// API Functions
export async function listStaffMembers(): Promise<StaffMember[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockStaff;
  }

  try {
    const { data } = await api.get("/staff");
    const members = toArray<StaffMember>(data);
    return members.map((member) => StaffMemberSchema.parse(member));
  } catch (error) {
    console.error("Failed to fetch staff members:", error);
    throw new Error("Unable to load staff members. Please try again.");
  }
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  try {
    const { data } = await api.get(`/staff/${id}`);
    return StaffMemberSchema.parse(data);
  } catch (error) {
    console.error("Failed to fetch staff member:", error);
    throw new Error("Unable to load staff member details. Please try again.");
  }
}

export async function createStaffMember(
  input: CreateStaffMemberInput
): Promise<StaffMember> {
  try {
    const validatedInput = CreateStaffMemberSchema.parse(input);
    const { data } = await api.post("/staff", validatedInput);
    return StaffMemberSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create staff member:", error);
    throw new Error("Unable to create staff member. Please try again.");
  }
}

export async function updateStaffMember(
  id: string,
  updates: Partial<CreateStaffMemberInput>
): Promise<StaffMember> {
  try {
    const { data } = await api.patch(`/staff/${id}`, updates);
    return StaffMemberSchema.parse(data);
  } catch (error) {
    console.error("Failed to update staff member:", error);
    throw new Error("Unable to update staff member. Please try again.");
  }
}

export async function deleteStaffMember(id: string): Promise<void> {
  try {
    await api.delete(`/staff/${id}`);
  } catch (error) {
    console.error("Failed to delete staff member:", error);
    throw new Error("Unable to delete staff member. Please try again.");
  }
}

export async function getStaffPerformance(
  staffId: string,
  period?: string
): Promise<StaffPerformance> {
  try {
    const params = period ? `?period=${period}` : "";
    const { data } = await api.get(`/staff/${staffId}/performance${params}`);
    return StaffPerformanceSchema.parse(data);
  } catch (error) {
    console.error("Failed to fetch staff performance:", error);
    throw new Error("Unable to load staff performance. Please try again.");
  }
}
