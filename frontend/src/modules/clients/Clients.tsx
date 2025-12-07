import styled from "styled-components";
import { clientsApi } from "./api";
import type { Client, CreateClientInput } from "./api";
import { listAppointments, type Appointment } from "../appointments/api";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import ClientDetailModal from "./ClientDetailModal";
import CreateClientModal from "./CreateClientModal";
import { Plus, Phone, Calendar, Clock, User } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useResource } from "../../hooks/useResource";
import { useListFilter } from "../../hooks/useListFilter";
import { useModalState } from "../../hooks/useModalState";
import PageHeader from "../../ui/components/PageHeader";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import { useQuery } from "@tanstack/react-query";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.color.bg || "#ffffff"};
  padding-bottom: 1.5rem;
`;

const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ClientCard = styled(Card)`
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadowLg};
  }
`;

const ClientHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ClientAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.brand100 || "#dbeafe"};
  color: ${({ theme }) => theme.color.brand700 || "#1d4ed8"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.h3`
  margin: 0 0 4px 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClientMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: ${({ theme }) => theme.color.grey700};
  font-size: 0.875rem;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const UpcomingAppointment = styled.div`
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.brand50 || "#eff6ff"};
  border-radius: ${({ theme }) => theme.radii.sm};
  border-left: 3px solid ${({ theme }) => theme.color.brand600 || "#2563eb"};
  margin-top: 0.75rem;
`;

const AppointmentLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.brand700 || "#1d4ed8"};
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const AppointmentDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.red500 || "#fef2f2"};
  color: ${({ theme }) => theme.color.red500 || "#b91c1c"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.red600 || "#fecaca"};
`;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Clients() {
  // Modal states using custom hook
  const detailModal = useModalState<Client>();
  const createModal = useModalState();

  // Use your generic resource hook
  const {
    listQuery: { data: clients = [], isLoading, isError, error },
    createMutation,
    updateMutation,
    deleteMutation,
  } = useResource({
    resourceKey: "clients",
    client: clientsApi,
    toastMessages: {
      create: "Client created successfully",
      update: "Client updated successfully",
      delete: "Client deleted successfully",
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: listAppointments,
    staleTime: 30000,
  });

  // Filtering using custom hook
  const { filteredItems, searchQuery, setSearchQuery } = useListFilter(
    clients,
    {
      searchFields: ["name", "email", "phone"],
    }
  );

  // Callbacks
  const handleCreate = useCallback(
    (input: CreateClientInput) => {
      createMutation.mutate(input, {
        onSuccess: () => createModal.close(),
      });
    },
    [createMutation, createModal]
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<CreateClientInput>) => {
      updateMutation.mutate(
        { id, updates },
        {
          onSuccess: () => detailModal.close(),
        }
      );
    },
    [updateMutation, detailModal]
  );

  const handleDelete = useCallback(
    (id: string, confirmMessage?: string) => {
      const message =
        confirmMessage || `Are you sure you want to delete this client?`;
      if (window.confirm(message)) {
        deleteMutation.mutate(id, {
          onSuccess: () => detailModal.close(),
        });
      }
    },
    [deleteMutation, detailModal]
  );

  const getUpcomingAppointment = useCallback(
    (clientId: string): Appointment | null => {
      const now = new Date();
      const clientAppointments = appointments
        .filter(
          (apt) => apt.clientId === clientId && new Date(apt.datetimeISO) >= now
        )
        .sort(
          (a, b) =>
            new Date(a.datetimeISO).getTime() -
            new Date(b.datetimeISO).getTime()
        );

      return clientAppointments[0] || null;
    },
    [appointments]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Clients" />
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <PageHeader title="Clients" />
        <ErrorMessage>
          {error instanceof Error ? error.message : "Error loading clients"}
        </ErrorMessage>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <StickyHeader>
        <PageHeader title="Clients">
          <Button
            onClick={() => createModal.open()}
            variation="primary"
            size="medium"
          >
            <Plus size={18} />
            New Client
          </Button>
        </PageHeader>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search clients by name, email, or phone..."
        />
      </StickyHeader>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={User}
          title={searchQuery ? "No clients found" : "No clients yet"}
          description={
            !searchQuery
              ? 'Click "New Client" to add your first client.'
              : undefined
          }
        />
      ) : (
        <Grid>
          {filteredItems.map((client) => {
            const upcomingApt = getUpcomingAppointment(client.id);

            return (
              <ClientCard
                key={client.id}
                onClick={() => detailModal.open(client)}
              >
                <ClientHeader>
                  <ClientAvatar>{getInitials(client.name)}</ClientAvatar>
                  <ClientInfo>
                    <ClientName>{client.name}</ClientName>
                    <ClientMeta>
                      {client.phone && (
                        <MetaRow>
                          <Phone size={14} />
                          <span>{client.phone}</span>
                        </MetaRow>
                      )}
                    </ClientMeta>
                  </ClientInfo>
                </ClientHeader>

                {upcomingApt ? (
                  <UpcomingAppointment>
                    <AppointmentLabel>Next Appointment</AppointmentLabel>
                    <AppointmentDetails>
                      <MetaRow>
                        <Calendar size={14} />
                        <span>
                          {new Date(upcomingApt.datetimeISO).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </MetaRow>
                      <MetaRow>
                        <Clock size={14} />
                        <span>
                          {new Date(upcomingApt.datetimeISO).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </span>
                      </MetaRow>
                    </AppointmentDetails>
                  </UpcomingAppointment>
                ) : (
                  <div
                    style={{
                      color: "#9ca3af",
                      fontSize: "0.875rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    No upcoming appointments
                  </div>
                )}
              </ClientCard>
            );
          })}
        </Grid>
      )}

      <ClientDetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        client={detailModal.selectedItem}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
      />

      <CreateClientModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onCreate={handleCreate}
        creating={createMutation.isPending}
      />
    </PageWrapper>
  );
}
