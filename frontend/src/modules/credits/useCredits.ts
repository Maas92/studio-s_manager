import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { creditClient } from "../../services/creditClient";
import toast from "react-hot-toast";

export function useClientBalance(clientId?: string) {
  return useQuery({
    queryKey: ["credits", "balance", clientId],
    queryFn: () =>
      creditClient.getBalance(clientId!).then((res) => res.data.data.balance),
    enabled: !!clientId,
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function useCreditHistory(clientId?: string) {
  return useQuery({
    queryKey: ["credits", "history", clientId],
    queryFn: () =>
      creditClient.getHistory(clientId!).then((res) => res.data.data.history),
    enabled: !!clientId,
  });
}

export function useCredit() {
  const qc = useQueryClient();

  const addCreditMutation = useMutation({
    mutationFn: creditClient.addCredit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Credit added to client account");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add credit");
    },
  });

  const redeemCreditMutation = useMutation({
    mutationFn: creditClient.redeemCredit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Credit redeemed");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to redeem credit");
    },
  });

  return {
    addCreditMutation,
    redeemCreditMutation,
  };
}
