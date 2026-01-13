import api from "./api";

export const cashUpClient = {
  // Cash-up sessions
  create: (data: { openingFloat: number; sessionDate?: string }) =>
    api.post("/cash-ups", data),

  getAll: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get("/cash-ups", { params }),

  getById: (id: string) => api.get(`/cash-ups/${id}`),

  update: (id: string, data: any) => api.patch(`/cash-ups/${id}`, data),

  complete: (id: string, data: { actualCash: number; notes?: string }) =>
    api.post(`/cash-ups/${id}/complete`, data),

  reconcile: (id: string, notes?: string) =>
    api.post(`/cash-ups/${id}/reconcile`, { notes }),

  // Expenses
  addExpense: (
    cashUpId: string,
    data: { description: string; amount: number; category: string }
  ) => api.post(`/cash-ups/${cashUpId}/expenses`, data),

  updateExpense: (cashUpId: string, expenseId: string, data: any) =>
    api.patch(`/cash-ups/${cashUpId}/expenses/${expenseId}`, data),

  deleteExpense: (cashUpId: string, expenseId: string) =>
    api.delete(`/cash-ups/${cashUpId}/expenses/${expenseId}`),

  uploadReceipt: (cashUpId: string, expenseId: string, file: File) => {
    const formData = new FormData();
    formData.append("receipt", file);
    return api.post(
      `/cash-ups/${cashUpId}/expenses/${expenseId}/receipt`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  // Safe drops
  addSafeDrop: (
    cashUpId: string,
    data: { amount: number; reason?: string; notes?: string }
  ) => api.post(`/cash-ups/${cashUpId}/safe-drops`, data),

  updateSafeDrop: (cashUpId: string, dropId: string, data: any) =>
    api.patch(`/cash-ups/${cashUpId}/safe-drops/${dropId}`, data),

  deleteSafeDrop: (cashUpId: string, dropId: string) =>
    api.delete(`/cash-ups/${cashUpId}/safe-drops/${dropId}`),

  // Reports & Summary
  getSummary: (startDate?: string, endDate?: string) =>
    api.get("/cash-ups/summary", { params: { startDate, endDate } }),

  getDailySnapshot: () => api.get("/cash-ups/daily-snapshot"),
};
