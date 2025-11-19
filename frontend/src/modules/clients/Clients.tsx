import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import toast from "react-hot-toast";
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  type Client,
  type CreateClientInput,
} from "./api";
import { listAppointments, type Appointment } from "../appointments/api";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import Spinner from "../../ui/components/Spinner";
import ClientDetailModal from "./ClientDetailModal";
import CreateClientModal from "./CreateClientModal";
import AppointmentModal, {
  type AppointmentFormValues,
} from "../appointments/AppointmentsModal";
import { Plus, Search, User, Phone, Calendar, Clock } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { listTreatments, listStaff } from "../appointments/api";

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

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PageTitle = styled.h2`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

const SearchBar = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.color.mutedText};
  pointer-events: none;
`;

const SearchInput = styled(Input)`
  padding-left: 3.75rem;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.red500 || "#fef2f2"};
  color: ${({ theme }) => theme.color.red500 || "#b91c1c"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.red600 || "#fecaca"};
`;

const INITIAL_APPOINTMENT_FORM: AppointmentFormValues = {
  client: "",
  treatment: "",
  staff: "",
  datetimeLocal: "",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Clients() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormValues>(
    INITIAL_APPOINTMENT_FORM
  );

  // Queries
  const {
    data: clients = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: listClients,
    staleTime: 30000,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: listAppointments,
    staleTime: 30000,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments"],
    queryFn: listTreatments,
    staleTime: 60000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: listStaff,
    staleTime: 60000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowCreateModal(false);
      toast.success("Client created successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create client",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateClientInput>;
    }) => updateClient(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowDetailModal(false);
      setSelectedClient(null);
      toast.success("Client updated successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update client",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowDetailModal(false);
      setSelectedClient(null);
      toast.success("Client deleted successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete client",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;

    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.phone?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  // Get upcoming appointment for a client
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

  // Handlers
  const handleClientClick = useCallback((client: Client) => {
    setSelectedClient(client);
    setShowDetailModal(true);
  }, []);

  const handleUpdateClient = useCallback(
    (id: string, updates: Partial<CreateClientInput>) => {
      updateMutation.mutate({ id, updates });
    },
    [updateMutation]
  );

  const handleDeleteClient = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleCreateAppointmentForClient = useCallback(
    (clientId: string, clientName: string) => {
      setAppointmentForm({
        ...INITIAL_APPOINTMENT_FORM,
        client: clientId,
      });
      setShowAppointmentModal(true);
    },
    []
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Clients</PageTitle>
        </HeaderRow>
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Clients</PageTitle>
        </HeaderRow>
        <ErrorMessage>
          {error instanceof Error ? error.message : "Error loading clients"}
        </ErrorMessage>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <StickyHeader>
        <HeaderRow>
          <PageTitle>Clients</PageTitle>
          <Button
            onClick={() => setShowCreateModal(true)}
            variation="primary"
            size="medium"
          >
            <Plus size={18} />
            New Client
          </Button>
        </HeaderRow>

        <SearchBar>
          <SearchIcon>
            <Search size={20} />
          </SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search clients by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBar>
      </StickyHeader>

      {filteredClients.length === 0 ? (
        <EmptyState>
          <User size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <p>
            {searchQuery
              ? "No clients found matching your search."
              : "No clients yet."}
          </p>
          <p>
            {!searchQuery && 'Click "New Client" to add your first client.'}
          </p>
        </EmptyState>
      ) : (
        <Grid>
          {filteredClients.map((client) => {
            const upcomingApt = getUpcomingAppointment(client.id);

            return (
              <ClientCard
                key={client.id}
                onClick={() => handleClientClick(client)}
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
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onUpdate={handleUpdateClient}
        onDelete={handleDeleteClient}
        onCreateAppointment={handleCreateAppointmentForClient}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
      />

      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(values) => createMutation.mutate(values)}
        creating={createMutation.isPending}
      />

      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setAppointmentForm(INITIAL_APPOINTMENT_FORM);
        }}
        values={appointmentForm}
        onChange={(patch) =>
          setAppointmentForm((prev) => ({ ...prev, ...patch }))
        }
        onSubmit={() => {
          // This would call your create appointment mutation
          console.log("Create appointment:", appointmentForm);
          setShowAppointmentModal(false);
          setAppointmentForm(INITIAL_APPOINTMENT_FORM);
        }}
        submitting={false}
        clients={clients}
        treatments={treatments}
        staff={staff}
      />
    </PageWrapper>
  );
}
