import { createResourceClient } from "../services/resourceFactory";
import {
  ClientSchema,
  CreateClientSchema,
  type Client,
  type CreateClientInput,
} from "../modules/clients/ClientSchema";

export const clientsClient = createResourceClient<Client, CreateClientInput>({
  basePath: "/clients",
  schema: ClientSchema,
  createSchema: CreateClientSchema,
});
