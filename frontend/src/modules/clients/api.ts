import api from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";
import { mockClients } from "./mockClients";

// Schemas
export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  loyaltyPoints: z.number().optional(),
});

export const CreateClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
});

// Types
export type Client = z.infer<typeof ClientSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;

const USE_MOCK_DATA = true; // Toggle for development

// API Functions
export async function listClients(): Promise<Client[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
    return mockClients;
  }
  try {
    const { data } = await api.get("/clients");
    const clients = toArray<Client>(data);
    return clients.map((client) => ClientSchema.parse(client));
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    throw new Error("Unable to load clients. Please try again.");
  }
}

export async function getClient(id: string): Promise<Client> {
  try {
    const { data } = await api.get(`/clients/${id}`);
    return ClientSchema.parse(data);
  } catch (error) {
    console.error("Failed to fetch client:", error);
    throw new Error("Unable to load client details. Please try again.");
  }
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  try {
    const validatedInput = CreateClientSchema.parse(input);
    const { data } = await api.post("/clients", validatedInput);
    return ClientSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create client:", error);
    throw new Error("Unable to create client. Please try again.");
  }
}

export async function updateClient(
  id: string,
  updates: Partial<CreateClientInput>
): Promise<Client> {
  try {
    const { data } = await api.patch(`/clients/${id}`, updates);
    return ClientSchema.parse(data);
  } catch (error) {
    console.error("Failed to update client:", error);
    throw new Error("Unable to update client. Please try again.");
  }
}

export async function deleteClient(id: string): Promise<void> {
  try {
    await api.delete(`/clients/${id}`);
  } catch (error) {
    console.error("Failed to delete client:", error);
    throw new Error("Unable to delete client. Please try again.");
  }
}
