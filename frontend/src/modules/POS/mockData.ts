// Mock data for POS development/testing

export const mockClients = [
  {
    id: "c1",
    name: "Sarah Johnson",
    email: "sarah@email.com",
    phone: "555-0101",
    loyaltyPoints: 450,
  },
  {
    id: "c2",
    name: "Mike Chen",
    email: "mike@email.com",
    phone: "555-0102",
    loyaltyPoints: 230,
  },
  {
    id: "c3",
    name: "Emma Davis",
    email: "emma@email.com",
    phone: "555-0103",
    loyaltyPoints: 680,
  },
  {
    id: "c4",
    name: "James Wilson",
    email: "james@email.com",
    phone: "555-0104",
    loyaltyPoints: 320,
  },
];

export const mockStaff = [
  {
    id: "st1",
    name: "Emma Wilson",
    role: "Senior Aesthetician",
    specialties: ["Facial", "Skincare"],
    available: true,
  },
  {
    id: "st2",
    name: "David Chen",
    role: "Massage Therapist",
    specialties: ["Massage"],
    available: true,
  },
  {
    id: "st3",
    name: "Sophie Martinez",
    role: "Nail Technician",
    specialties: ["Nails", "Manicure", "Pedicure"],
    available: true,
  },
  {
    id: "st4",
    name: "James Brown",
    role: "Hair Stylist",
    specialties: ["Hair"],
    available: false,
  },
];

export const mockAppointments = [
  {
    id: "apt1",
    clientId: "c1",
    clientName: "Sarah Johnson",
    treatmentName: "Swedish Massage",
    treatmentId: "t1",
    price: 85,
    time: "10:00 AM",
    status: "confirmed",
    duration: 60,
    staffId: "st2",
    staffName: "David Chen",
  },
  {
    id: "apt2",
    clientId: "c2",
    clientName: "Mike Chen",
    treatmentName: "Classic Facial",
    treatmentId: "t3",
    price: 75,
    time: "11:30 AM",
    status: "confirmed",
    duration: 60,
    staffId: "st1",
    staffName: "Emma Wilson",
  },
  {
    id: "apt3",
    clientId: "c3",
    clientName: "Emma Davis",
    treatmentName: "Gel Manicure",
    treatmentId: "t4",
    price: 45,
    time: "2:00 PM",
    status: "confirmed",
    duration: 45,
    staffId: "st3",
    staffName: "Sophie Martinez",
  },
  {
    id: "apt4",
    clientId: "c4",
    clientName: "James Wilson",
    treatmentName: "Deep Tissue Massage",
    treatmentId: "t2",
    price: 110,
    time: "3:30 PM",
    status: "confirmed",
    duration: 75,
    staffId: "st2",
    staffName: "David Chen",
  },
];

export const mockProducts = [
  {
    id: "p1",
    name: "Hydrating Serum",
    price: 45,
    stock: 12,
    category: "Skincare",
    sku: "SKU-001",
    retail: true,
  },
  {
    id: "p2",
    name: "Anti-Aging Cream",
    price: 65,
    stock: 8,
    category: "Skincare",
    sku: "SKU-002",
    retail: true,
  },
  {
    id: "p3",
    name: "Nail Polish - Red",
    price: 12,
    stock: 25,
    category: "Nails",
    sku: "SKU-003",
    retail: true,
  },
  {
    id: "p4",
    name: "Massage Oil",
    price: 28,
    stock: 15,
    category: "Massage",
    sku: "SKU-004",
    retail: true,
  },
  {
    id: "p5",
    name: "Face Mask Set",
    price: 35,
    stock: 10,
    category: "Skincare",
    sku: "SKU-005",
    retail: true,
  },
  {
    id: "p6",
    name: "Cuticle Oil",
    price: 15,
    stock: 20,
    category: "Nails",
    sku: "SKU-006",
    retail: true,
  },
  {
    id: "p7",
    name: "Hair Treatment Mask",
    price: 38,
    stock: 14,
    category: "Hair",
    sku: "SKU-007",
    retail: true,
  },
  {
    id: "p8",
    name: "Nail Polish - Pink",
    price: 12,
    stock: 30,
    category: "Nails",
    sku: "SKU-008",
    retail: true,
  },
  {
    id: "p9",
    name: "Exfoliating Scrub",
    price: 42,
    stock: 6,
    category: "Skincare",
    sku: "SKU-009",
    retail: true,
  },
];

export const mockTreatments = [
  {
    id: "t1",
    name: "Swedish Massage",
    price: 85,
    duration: 60,
    category: "Massage",
    isActive: true,
  },
  {
    id: "t2",
    name: "Deep Tissue Massage",
    price: 110,
    duration: 75,
    category: "Massage",
    isActive: true,
  },
  {
    id: "t3",
    name: "Classic Facial",
    price: 75,
    duration: 60,
    category: "Facial",
    isActive: true,
  },
  {
    id: "t4",
    name: "Gel Manicure",
    price: 45,
    duration: 45,
    category: "Nails",
    isActive: true,
  },
  {
    id: "t5",
    name: "Spa Pedicure",
    price: 55,
    duration: 60,
    category: "Nails",
    isActive: true,
  },
  {
    id: "t6",
    name: "Hot Stone Massage",
    price: 130,
    duration: 90,
    category: "Massage",
    isActive: true,
  },
  {
    id: "t7",
    name: "Anti-Aging Facial",
    price: 120,
    duration: 75,
    category: "Facial",
    isActive: true,
  },
  {
    id: "t8",
    name: "Aromatherapy Massage",
    price: 90,
    duration: 60,
    category: "Massage",
    isActive: true,
  },
];

// Helper functions for mock data
export const getClientById = (id: string) => {
  return mockClients.find((c) => c.id === id);
};

export const getTreatmentById = (id: string) => {
  return mockTreatments.find((t) => t.id === id);
};

export const getProductById = (id: string) => {
  return mockProducts.find((p) => p.id === id);
};

export const getAppointmentById = (id: string) => {
  return mockAppointments.find((a) => a.id === id);
};

export const getStaffById = (id: string) => {
  return mockStaff.find((s) => s.id === id);
};