/**
 * Generic React Query hook wrapper for resources.
 * Returns listQuery, getQuery factory, and mutations (create/update/delete).
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import toast from "react-hot-toast";

type Client<T, CreateInput> = {
  list: () => Promise<T[]>;
  get: (id: string) => Promise<T>;
  create: (input: CreateInput) => Promise<T>;
  update: (id: string, updates: Partial<CreateInput>) => Promise<T>;
  delete: (id: string) => Promise<void>;
  transfer: (id: string, targetId: string, quantity: number) => Promise<void>;
};

export function useResource<T, CreateInput = Partial<T>>(opts: {
  resourceKey: string;
  client: Client<T, CreateInput>;
  toastMessages?: {
    create?: string;
    update?: string;
    delete?: string;
    transfer?: string;
  };
}) {
  const { resourceKey, client, toastMessages } = opts;
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: [resourceKey],
    queryFn: client.list,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateInput) => client.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [resourceKey] });
      if (toastMessages?.create) toast.success(toastMessages.create);
    },
    onError: (e: any) => toast.error(e?.message ?? "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateInput>;
    }) => client.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [resourceKey] });
      if (toastMessages?.update) toast.success(toastMessages.update);
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [resourceKey] });
      if (toastMessages?.delete) toast.success(toastMessages.delete);
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const transferMutation = useMutation({
    mutationFn: (payload: {
      fromStockId: string;
      toLocation: "retail" | "treatment" | "storage";
      quantity: number;
    }) =>
      client.transfer(
        payload.fromStockId,
        payload.toLocation,
        payload.quantity
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [resourceKey] });
      if (toastMessages?.transfer) toast.success(toastMessages.transfer);
    },
    onError: (e: any) => toast.error(e?.message ?? "Transfer failed"),
  });

  function getQuery(id: string) {
    return useQuery({
      queryKey: [resourceKey, id],
      queryFn: () => client.get(id),
      staleTime: 30_000,
    }) as UseQueryResult<T, unknown>;
  }

  return {
    listQuery,
    getQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    transferMutation,
  };
}
