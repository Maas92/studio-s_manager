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


// ============================================================================
// 3. UPDATED CASH-UP MODULE WITH BACKEND INTEGRATION
// File: modules/cashup/CashUpModule.tsx (Updated version)
// ============================================================================

// Add these imports to your existing CashUpModule component:


// Update the component to integrate with backend:
export default function CashUpModule({
  cashUpId, // Pass the cash-up session ID
  onComplete,
  onSave,
}: {
  cashUpId?: string;
  onComplete?: (data: any) => void;
  onSave?: (data: any) => void;
}) {
  const {
    getQuery,
    dailySnapshotQuery,
    createMutation,
    completeMutation,
    addExpenseMutation,
    deleteExpenseMutation,
    uploadReceiptMutation,
    addSafeDropMutation,
    deleteSafeDropMutation,
  } = useCashUp();

  // Load existing session or daily snapshot
  const { data: cashUpData } = cashUpId
    ? getQuery(cashUpId)
    : dailySnapshotQuery;

  const [sessionId, setSessionId] = useState<string | null>(cashUpId || null);

  // Initialize from backend data
  useEffect(() => {
    if (cashUpData) {
      setSessionId(cashUpData.id);
      setOpeningFloatInput(cashUpData.openingFloat.toString());
      setExpenses(cashUpData.expenses || []);
      // ... set other state from backend
    }
  }, [cashUpData]);

  // Updated handlers to call backend:
  
  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !sessionId) return;

    try {
      await addExpenseMutation.mutateAsync({
        cashUpId: sessionId,
        data: {
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
        },
      });
      
      setNewExpense({ description: "", amount: "", category: "general" });
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const handleRemoveExpense = async (id: string) => {
    if (!sessionId) return;
    
    try {
      await deleteExpenseMutation.mutateAsync({
        cashUpId: sessionId,
        expenseId: id,
      });
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    
    try {
      const result = await completeMutation.mutateAsync({
        id: sessionId,
        data: {
          actualCash: parseFloat(actualCash),
          notes: calculations.variance !== 0 ? "Variance detected" : undefined,
        },
      });
      
      onComplete?.(result.data.data.cashUp);
    } catch (error) {
      console.error("Failed to complete cash-up:", error);
    }
  };

  // ... rest of component
}