import React, { useCallback, useState, useMemo } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Phone,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  User as UserIcon,
  Mail,
  TrendingUp,
  Gift,
} from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import Card from "../../ui/components/Card";

import { useClients } from "./useClient";
import { useAppointments } from "../appointments/useAppointments";
import { useListFilter } from "../../hooks/useListFilter";
import { useModalState } from "../../hooks/useModalState";
import CreateClientModal from "./CreateClientModal";
import ClientDetailModal from "./ClientDetailModal";
import useAuth from "../../hooks/useAuth";

import type { Client } from "./ClientSchema";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const ControlsWrapper = styled.div`
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.color.bg};
  z-index: 5;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
`;

const Grid = styled.div`
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ClientCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.color.brand400},
      ${({ theme }) => theme.color.brand600}
    );
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const ClientHeader = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const Avatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radii.round};
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.brand100},
    ${({ theme }) => theme.color.brand200}
  );
  color: ${({ theme }) => theme.color.brand700};
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
  border: 2px solid ${({ theme }) => theme.color.brand300};
`;

const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;

const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};

  svg {
    color: ${({ theme }) => theme.color.brand600};
    flex-shrink: 0;
  }
`;

const LoyaltyBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.yellow100},
    ${({ theme }) => theme.color.yellow200}
  );
  color: ${({ theme }) => theme.color.yellow700};
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.color.yellow200};
`;

const AppointmentInfo = styled.div`
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.blue100};
  border-radius: ${({ theme }) => theme.radii.sm};
  border-left: 3px solid ${({ theme }) => theme.color.blue500};
`;

const AppointmentTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.blue500};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
`;

const AppointmentDetails = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const AppointmentDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};

  svg {
    color: ${({ theme }) => theme.color.blue500};
  }
`;

const NoAppointmentInfo = styled.div`
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.875rem;
  text-align: center;
  border: 1px dashed ${({ theme }) => theme.color.border};
`;

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => (p[0] ?? "").toUpperCase())
    .join("")
    .slice(0, 2);
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const { canManageClients } = useAuth();

  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useClients();
  const { listQuery: apptQuery } = useAppointments();

  const clients = listQuery.data ?? [];
  const appointments = apptQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const [searchQuery, setSearchQuery] = useState("");

  const { filteredItems } = useListFilter<Client>(clients, {
    searchFields: ["name", "email", "phone"],
    // searchQuery,
  });

  const detailModal = useModalState<Client>();
  const createModal = useModalState();

  const getNextAppointmentFor = useCallback(
    (clientId: string) => {
      const now = Date.now();
      const next = (appointments ?? [])
        .filter(
          (a) =>
            a.clientId === clientId && new Date(a.datetimeISO).getTime() >= now
        )
        .sort(
          (a, b) =>
            new Date(a.datetimeISO).getTime() -
            new Date(b.datetimeISO).getTime()
        )[0];
      return next ?? null;
    },
    [appointments]
  );

  const getClientStats = useCallback(
    (clientId: string) => {
      const clientAppointments = appointments.filter(
        (a) => a.clientId === clientId
      );
      return {
        total: clientAppointments.length,
        completed: clientAppointments.filter((a) => a.status === "completed")
          .length,
        upcoming: clientAppointments.filter(
          (a) => new Date(a.datetimeISO).getTime() >= Date.now()
        ).length,
      };
    },
    [appointments]
  );

  const handleCreate = useCallback(
    (payload: any) => {
      createMutation.mutate(payload, {
        onSuccess: () => {
          createModal.close();
          toast.success("Client created successfully!");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to create client");
        },
      });
    },
    [createMutation, createModal]
  );

  const handleUpdate = useCallback(
    (id: string, updates: any) => {
      updateMutation.mutate(
        { id, updates },
        {
          onSuccess: () => {
            detailModal.close();
            toast.success("Client updated successfully!");
          },
          onError: (error: any) => {
            toast.error(error?.message ?? "Failed to update client");
          },
        }
      );
    },
    [updateMutation, detailModal]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          detailModal.close();
          toast.success("Client deleted successfully!");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to delete client");
        },
      });
    },
    [deleteMutation, detailModal]
  );

  const handleCreateAppointment = useCallback(
    (clientId: string, clientName: string) => {
      detailModal.close();

      navigate("/appointments", {
        state: {
          createAppointment: true,
          clientId,
          clientName,
        },
      });
    },
    [navigate, detailModal]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Clients" />
        <div
          style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
        >
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <PageHeader title="Clients" />
        <div style={{ padding: "1rem", color: "var(--color-red500)" }}>
          {error instanceof Error ? error.message : "Failed to load clients"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ControlsWrapper>
        <PageHeader title="Clients">
          {canManageClients && (
            <Button variation="primary" onClick={() => createModal.open()}>
              <Plus size={16} /> New Client
            </Button>
          )}
        </PageHeader>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search clients by name, email, or phone..."
        />
      </ControlsWrapper>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          title={searchQuery ? "No clients found" : "No clients yet"}
        >
          {!searchQuery && canManageClients && (
            <p>Add your first client to get started.</p>
          )}
        </EmptyState>
      ) : (
        <Grid>
          {filteredItems.map((client) => {
            const nextAppointment = getNextAppointmentFor(client.id);
            const stats = getClientStats(client.id);

            return (
              <ClientCard
                key={client.id}
                hoverable
                onClick={() => detailModal.open(client)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    detailModal.open(client);
                  }
                }}
              >
                <ClientHeader>
                  <Avatar>{getInitials(client.name)}</Avatar>
                  <ClientInfo>
                    <ClientName>{client.name}</ClientName>
                    <ContactInfo>
                      {client.phone && (
                        <ContactItem>
                          <Phone size={14} />
                          {client.phone}
                        </ContactItem>
                      )}
                      {client.email && (
                        <ContactItem>
                          <Mail size={14} />
                          {client.email}
                        </ContactItem>
                      )}
                    </ContactInfo>
                  </ClientInfo>
                  {client.loyaltyPoints && client.loyaltyPoints > 50 && (
                    <LoyaltyBadge>
                      <Gift size={14} />
                      {client.loyaltyPoints} pts
                    </LoyaltyBadge>
                  )}
                </ClientHeader>

                {nextAppointment ? (
                  <AppointmentInfo>
                    <AppointmentTitle>Next Appointment</AppointmentTitle>
                    <AppointmentDetails>
                      <AppointmentDetail>
                        <CalendarIcon size={14} />
                        {new Date(
                          nextAppointment.datetimeISO
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </AppointmentDetail>
                      <AppointmentDetail>
                        <ClockIcon size={14} />
                        {new Date(
                          nextAppointment.datetimeISO
                        ).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </AppointmentDetail>
                      {stats.total > 5 && (
                        <AppointmentDetail>
                          <TrendingUp size={14} />
                          {stats.total} visits
                        </AppointmentDetail>
                      )}
                    </AppointmentDetails>
                  </AppointmentInfo>
                ) : (
                  <NoAppointmentInfo>
                    No upcoming appointments
                  </NoAppointmentInfo>
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
        onCreateAppointment={handleCreateAppointment}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
        appointments={appointments}
        isAdmin={canManageClients}
      />

      {canManageClients && (
        <CreateClientModal
          isOpen={createModal.isOpen}
          onClose={createModal.close}
          onCreate={handleCreate}
          creating={createMutation.isPending}
        />
      )}
    </PageWrapper>
  );
}
