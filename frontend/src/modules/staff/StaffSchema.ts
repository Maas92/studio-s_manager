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
  hourlyRate: z.number().nullable().optional(),
  commissionRate: z.number().nullable().optional(),
});

export const StaffMemberSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string(),
  specializations: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  hireDate: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  certifications: z.array(z.string()).nullable().optional(),
  schedule: z.record(z.string(), z.string()).nullable().optional(), // e.g., { "monday": "9am-5pm" }
  avatar: z.string().nullable().optional(),
  performance: StaffPerformanceSchema.optional(),
  hourlyRate: z.number().nullable().optional(),
  commissionRate: z.number().nullable().optional(),
});

export const CreateStaffMemberSchema = z.object({
  firstName: z.string().min(1, "Name is required"),
  lastName: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  specializations: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  hireDate: z.string().optional(),
  bio: z.string().optional(),
  certifications: z.array(z.string()).nullable().optional(),
  schedule: z.record(z.string(), z.string()).optional(),
  hourlyRate: z.number().nullable().optional(),
  commissionRate: z.number().nullable().optional(),
});

export const StaffLeaveSchema = z.object({
  staffId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  leaveType: z.enum([
    "annual",
    "sick",
    "unpaid",
    "maternity",
    "paternity",
    "study",
    "other",
  ]),
  reason: z.string().optional(),
  status: z
    .enum(["pending", "approved", "rejected", "cancelled"])
    .default("approved"),
});

// Types
export type StaffPerformance = z.infer<typeof StaffPerformanceSchema>;
export type StaffMember = z.infer<typeof StaffMemberSchema>;
export type CreateStaffMemberInput = z.infer<typeof CreateStaffMemberSchema>;
export type StaffLeave = z.infer<typeof StaffLeaveSchema>;
