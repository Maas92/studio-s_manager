import { useResource } from "../../hooks/useResource";
import { clientsClient } from "../../services/clientsClient";
import type { Client, CreateClientInput } from "./ClientSchema";

export function useClients() {
  return useResource<Client, CreateClientInput>({
    resourceKey: "clients",
    client: clientsClient,
    toastMessages: {
      create: "Client created",
      update: "Client updated",
      delete: "Client deleted",
    },
  });
}
