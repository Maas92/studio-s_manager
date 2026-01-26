import api from "./api";

export const creditClient = {
  getBalance: (clientId: string) => api.get(`/credits/balance/${clientId}`),

  getHistory: (clientId: string, limit = 50) =>
    api.get(`/credits/history/${clientId}`, { params: { limit } }),

  getSummary: (clientId: string) => api.get(`/credits/summary/${clientId}`),

  getClientsWithCredit: () => api.get(`/credits/clients-with-balance`),

  addCredit: (data: {
    clientId: string;
    amount: number;
    sourceType: "change" | "prepayment" | "refund" | "manual";
    sourceTransactionId?: string;
    notes?: string;
  }) => api.post("/credits/add", data),

  redeemCredit: (data: {
    clientId: string;
    amount: number;
    sourceTransactionId?: string;
    notes?: string;
  }) => api.post("/credits/redeem", data),

  adjustCredit: (data: { clientId: string; amount: number; notes: string }) =>
    api.post("/credits/adjust", data),
};
