import { api } from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});
export type Client = z.infer<typeof ClientSchema>;

export async function listClients() {
  const { data } = await api.get("/clients");
  return toArray<Client>(data);
}

export async function createClient(payload: Omit<Client, "id">) {
  const { data } = await api.post("/clients", payload);
  return data as Client;
}
