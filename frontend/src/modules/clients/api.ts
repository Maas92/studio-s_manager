import { createResourceClient } from "../../services/resourceFactory";
import {
  ClientSchema,
  CreateClientSchema,
  type Client,
  type CreateClientInput,
} from "./ClientSchema";

// Create typed API client
export const clientsApi = createResourceClient<Client, CreateClientInput>({
  basePath: "/clients",
  schema: ClientSchema,
  createSchema: CreateClientSchema,
});

// Export individual functions for convenience
export const {
  list: listClients,
  get: getClient,
  create: createClient,
  update: updateClient,
  delete: deleteClient,
} = clientsApi;

// Export types
export type { Client, CreateClientInput };
