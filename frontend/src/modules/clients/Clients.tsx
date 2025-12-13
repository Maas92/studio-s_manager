import React, { useCallback, useState } from "react";
import styled from "styled-components";
import {
  Plus,
  Phone,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  User as UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import Card from "../../ui/components/Card";
import Modal from "../../ui/components/Modal";

import { useClients } from "./useClient";
import { useAppointments } from "../appointments/useAppointments";
import { useListFilter } from "../../hooks/useListFilter";
import { useModalState } from "../../hooks/useModalState";

import type { Client } from "./ClientSchema";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.brand100};
  color: ${({ theme }) => theme.color.brand700};
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
`;

const Name = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;

const Meta = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.text};
`;

const Input = styled.input`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.color.border};
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: ${({ theme }) => theme.color.brand600};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
  }

  &::placeholder {
    color: ${({ theme }) => theme.color.mutedText};
  }
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
  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useClients();
  const { listQuery: apptQuery } = useAppointments();

  const clients = listQuery.data ?? [];
  const appointments = apptQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const { filteredItems, searchQuery, setSearchQuery } = useListFilter<Client>(
    clients,
    {
      searchFields: ["name", "email", "phone"],
    }
  );

  const detailModal = useModalState<Client>();
  const createModal = useModalState();

  // Form state for create modal
  const [createFormData, setCreateFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const handleCreate = useCallback(
    (payload: Partial<Client>) => {
      createMutation.mutate(payload as any, {
        onSuccess: () => {
          createModal.close();
          setCreateFormData({ name: "", phone: "", email: "" });
          toast.success("Client created successfully");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to create client");
        },
      });
    },
    [createMutation, createModal]
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<Client>) => {
      updateMutation.mutate({ id, updates } as any, {
        onSuccess: () => {
          detailModal.close();
          toast.success("Client updated successfully");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to update client");
        },
      });
    },
    [updateMutation, detailModal]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this client?")) return;
      deleteMutation.mutate(id, {
        onSuccess: () => {
          detailModal.close();
          toast.success("Client deleted successfully");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to delete client");
        },
      });
    },
    [deleteMutation, detailModal]
  );

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

  const handleCreateSubmit = useCallback(() => {
    if (!createFormData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const payload: any = {
      name: createFormData.name.trim(),
    };

    // Only include optional fields if they have values
    if (createFormData.phone.trim()) {
      payload.phone = createFormData.phone.trim();
    }
    if (createFormData.email.trim()) {
      payload.email = createFormData.email.trim();
    }

    handleCreate(payload);
  }, [createFormData, handleCreate]);

  const handleCloseCreateModal = useCallback(() => {
    createModal.close();
    setCreateFormData({ name: "", phone: "", email: "" });
  }, [createModal]);

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
        <div style={{ padding: 12 }}>
          {error instanceof Error ? error.message : "Failed to load clients"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "transparent",
          zIndex: 5,
          paddingBottom: 12,
        }}
      >
        <PageHeader title="Clients">
          <Button variation="primary" onClick={() => createModal.open()}>
            <Plus size={16} /> New Client
          </Button>
        </PageHeader>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search clients by name, email or phone..."
        />
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          title={searchQuery ? "No clients found" : "No clients yet"}
        >
          {!searchQuery && <p>Click "New Client" to add your first client.</p>}
        </EmptyState>
      ) : (
        <Grid>
          {filteredItems.map((c) => {
            const next = getNextAppointmentFor(c.id);
            return (
              <Card
                key={c.id}
                onClick={() => detailModal.open(c)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") detailModal.open(c);
                }}
                style={{ cursor: "pointer" }}
              >
                <Row>
                  <Avatar>{getInitials(c.name)}</Avatar>
                  <div style={{ flex: 1 }}>
                    <Name>{c.name}</Name>
                    <Meta>
                      {c.phone && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Phone size={14} /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span style={{ marginLeft: 10 }}>{c.email}</span>
                      )}
                    </Meta>
                  </div>
                </Row>

                {next ? (
                  <div style={{ marginTop: 12, background: "transparent" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--brand700)",
                      }}
                    >
                      Next appointment
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <CalendarIcon size={14} />
                        <span>
                          {new Date(next.datetimeISO).toLocaleDateString()}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <ClockIcon size={14} />
                        <span>
                          {new Date(next.datetimeISO).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, color: "var(--muted)" }}>
                    No upcoming appointments
                  </div>
                )}
              </Card>
            );
          })}
        </Grid>
      )}

      {/* Detail modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        title={detailModal.selectedItem?.name ?? "Client"}
        size="md"
      >
        {detailModal.selectedItem ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <strong>Name:</strong> {detailModal.selectedItem.name}
            </div>
            <div>
              <strong>Phone:</strong> {detailModal.selectedItem.phone ?? "—"}
            </div>
            <div>
              <strong>Email:</strong> {detailModal.selectedItem.email ?? "—"}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button
                variation="primary"
                onClick={() =>
                  detailModal.selectedItem &&
                  handleUpdate(
                    detailModal.selectedItem.id,
                    detailModal.selectedItem
                  )
                }
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
              <Button
                variation="danger"
                onClick={() =>
                  detailModal.selectedItem &&
                  handleDelete(detailModal.selectedItem.id)
                }
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div>Loading…</div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={handleCloseCreateModal}
        title="Create Client"
        size="md"
      >
        <div style={{ display: "grid", gap: 16 }}>
          <FormField>
            <Label htmlFor="create-client-name">
              Name <span style={{ color: "#ef4444" }}>*</span>
            </Label>
            <Input
              id="create-client-name"
              type="text"
              placeholder="Enter client name"
              value={createFormData.name}
              onChange={(e) =>
                setCreateFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              autoFocus
            />
          </FormField>

          <FormField>
            <Label htmlFor="create-client-phone">Phone</Label>
            <Input
              id="create-client-phone"
              type="tel"
              placeholder="Enter phone number"
              value={createFormData.phone}
              onChange={(e) =>
                setCreateFormData((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField>
            <Label htmlFor="create-client-email">Email</Label>
            <Input
              id="create-client-email"
              type="email"
              placeholder="Enter email address"
              value={createFormData.email}
              onChange={(e) =>
                setCreateFormData((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
          </FormField>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button
              variation="primary"
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
              style={{ flex: 1 }}
            >
              {createMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
            <Button onClick={handleCloseCreateModal} style={{ flex: 1 }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
