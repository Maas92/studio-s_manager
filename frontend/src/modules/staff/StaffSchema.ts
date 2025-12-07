import { z } from "zod";

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
