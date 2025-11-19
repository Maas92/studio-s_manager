// pages/appointments/mockData.ts
import type { Appointment, Client, Treatment, Staff } from "./api";

export const mockClients: Client[] = [
  { id: "c1", name: "Jane Doe", email: "jane@example.com", phone: "555-0101" },
  {
    id: "c2",
    name: "John Smith",
    email: "john@example.com",
    phone: "555-0102",
  },
  {
    id: "c3",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "555-0103",
  },
  {
    id: "c4",
    name: "Michael Brown",
    email: "michael@example.com",
    phone: "555-0104",
  },
  {
    id: "c5",
    name: "Emily Davis",
    email: "emily@example.com",
    phone: "555-0105",
  },
];

export const mockTreatments: Treatment[] = [
  { id: "t1", name: "Deluxe Facial", durationMinutes: 60, price: 120 },
  { id: "t2", name: "Deep Tissue Massage", durationMinutes: 90, price: 150 },
  { id: "t3", name: "Aromatherapy Session", durationMinutes: 45, price: 90 },
  { id: "t4", name: "Hot Stone Therapy", durationMinutes: 75, price: 135 },
  { id: "t5", name: "Manicure & Pedicure", durationMinutes: 60, price: 80 },
];

export const mockStaff: Staff[] = [
  { id: "s1", name: "Therapist Alice", role: "Senior Therapist" },
  { id: "s2", name: "Therapist Bob", role: "Massage Specialist" },
  { id: "s3", name: "Therapist Carol", role: "Esthetician" },
];

export const mockAppointments: Appointment[] = [
  {
    id: "apt1",
    clientId: "c1",
    clientName: "Jane Doe",
    treatmentId: "t1",
    treatmentName: "Deluxe Facial",
    datetimeISO: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    status: "confirmed",
    staffId: "s1",
    staffName: "Therapist Alice",
  },
  {
    id: "apt2",
    clientId: "c2",
    clientName: "John Smith",
    treatmentId: "t2",
    treatmentName: "Deep Tissue Massage",
    datetimeISO: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: "confirmed",
    staffId: "s2",
    staffName: "Therapist Bob",
  },
  {
    id: "apt3",
    clientId: "c3",
    clientName: "Sarah Johnson",
    treatmentId: "t3",
    treatmentName: "Aromatherapy Session",
    datetimeISO: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    status: "pending",
    staffId: "s3",
    staffName: "Therapist Carol",
  },
  {
    id: "apt4",
    clientId: "c4",
    clientName: "Michael Brown",
    treatmentId: "t4",
    treatmentName: "Hot Stone Therapy",
    datetimeISO: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: "completed",
    staffId: "s1",
    staffName: "Therapist Alice",
  },
  {
    id: "apt5",
    clientId: "c5",
    clientName: "Emily Davis",
    treatmentId: "t5",
    treatmentName: "Manicure & Pedicure",
    datetimeISO: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    status: "confirmed",
    staffId: "s2",
    staffName: "Therapist Bob",
  },
  {
    id: "apt6",
    clientId: "c1",
    clientName: "Jane Doe",
    treatmentId: "t2",
    treatmentName: "Deep Tissue Massage",
    datetimeISO: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
    status: "pending",
    staffId: "s3",
    staffName: "Therapist Carol",
  },
];
