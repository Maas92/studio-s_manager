import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffKPIClient } from "../../services/staffKPIClient";
import type { StaffKPI, CreateStaffKPIInput } from "./StaffSchema";

export function useStaffKPIs(staffId?: string) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["staff-kpis", staffId],
    queryFn: () =>
      staffId ? staffKPIClient.listByStaffId(staffId) : Promise.resolve([]),
    enabled: !!staffId,
  });

  const useGetQuery = (id: string) =>
    useQuery({
      queryKey: ["staff-kpi", id],
      queryFn: () => staffKPIClient.get(id),
      enabled: !!id,
    });

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffKPIInput) => staffKPIClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-kpis"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateStaffKPIInput>;
    }) => staffKPIClient.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["staff-kpi"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffKPIClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-kpis"] });
    },
  });

  return {
    listQuery,
    useGetQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
