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

// Individual KPI Item Schema
export const KPIItemSchema = z.object({
  name: z.string(),
  score: z.number().min(1).max(5).nullable(),
  notes: z.string().optional(),
});

// KPI Category Schema
export const KPICategorySchema = z.object({
  category: z.string(),
  weight: z.number().min(0).max(1),
  items: z.array(KPIItemSchema),
  weightedScore: z.number().optional(),
});

// Staff KPI Schema
export const StaffKPISchema = z.object({
  id: z.string(),
  staffId: z.string(),
  month: z.string(), // Format: "YYYY-MM"
  reviewerId: z.string(),
  reviewerName: z.string(),
  categories: z.array(KPICategorySchema),
  totalScore: z.number(),
  comments: z.string().optional(),
  status: z.enum(["draft", "completed", "reviewed"]).default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Create KPI Input Schema
export const CreateStaffKPISchema = z.object({
  staffId: z.string(),
  month: z.string(),
  reviewerId: z.string(),
  reviewerName: z.string(),
  categories: z.array(KPICategorySchema),
  comments: z.string().optional(),
  status: z.enum(["draft", "completed", "reviewed"]).default("draft"),
});

// Types
export type StaffPerformance = z.infer<typeof StaffPerformanceSchema>;
export type StaffMember = z.infer<typeof StaffMemberSchema>;
export type CreateStaffMemberInput = z.infer<typeof CreateStaffMemberSchema>;
export type StaffLeave = z.infer<typeof StaffLeaveSchema>;
export type KPIItem = z.infer<typeof KPIItemSchema>;
export type KPICategory = z.infer<typeof KPICategorySchema>;
export type StaffKPI = z.infer<typeof StaffKPISchema>;
export type CreateStaffKPIInput = z.infer<typeof CreateStaffKPISchema>;

// Default KPI Template
export const DEFAULT_KPI_TEMPLATE: Omit<KPICategory, "weightedScore">[] = [
  {
    category: "Attendance & Punctuality",
    weight: 0.2,
    items: [
      { name: "On-time arrival rate", score: null },
      { name: "Unplanned absences", score: null },
      { name: "Shift coverage reliability", score: null },
    ],
  },
  {
    category: "Client Interaction",
    weight: 0.25,
    items: [
      { name: "Friendliness & professionalism", score: null },
      { name: "Client communication", score: null },
      { name: "Handling complaints/issues", score: null },
    ],
  },
  {
    category: "Work Quality",
    weight: 0.25,
    items: [
      { name: "Treatment accuracy", score: null },
      { name: "Hygiene & safety compliance", score: null },
      { name: "Consistency of results", score: null },
    ],
  },
  {
    category: "Behaviour & Conduct",
    weight: 0.15,
    items: [
      { name: "Respect toward clients", score: null },
      { name: "Respect toward colleagues", score: null },
      { name: "Dress code & grooming", score: null },
      { name: "Phone use during shifts", score: null },
    ],
  },
  {
    category: "Productivity & Sales",
    weight: 0.1,
    items: [
      { name: "Treatments completed", score: null },
      { name: "Rebooking rate", score: null },
      { name: "Add-on / upsell effort", score: null },
    ],
  },
  {
    category: "Learning & Growth",
    weight: 0.05,
    items: [
      { name: "Training attendance", score: null },
      { name: "Skill improvement", score: null },
      { name: "Initiative", score: null },
    ],
  },
];
