import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { Plus, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import Card from "../../ui/components/Card";
import Modal from "../../ui/components/Modal";

import { useStaff } from "./useStaff";
import { useListFilter } from "../../hooks/useListFilter";
import { useModalState } from "../../hooks/useModalState";

import type { StaffMember } from "./StaffSchema";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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

const Row = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Name = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
`;

const Sub = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

export default function StaffPage() {
  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useStaff();
  const staff = listQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const { filteredItems, searchQuery, setSearchQuery } =
    useListFilter<StaffMember>(staff, {
      searchFields: ["firstName", "lastName", "email", "phone", "role"],
    });

  const detailModal = useModalState<StaffMember>();
  const createModal = useModalState();

  const [form, setForm] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
  }>({});

  const openCreate = useCallback(() => {
    setForm({});
    createModal.open();
  }, [createModal]);

  const handleCreate = useCallback(() => {
    createMutation.mutate(
      {
        firstName: form.firstName || "",
        lastName: form.lastName || "",
        email: form.email || "",
        phone: form.phone || "",
        role: form.role || "",
        status: "active",
      },
      {
        onSuccess: () => {
          createModal.close();
          toast.success("Staff member created");
        },
      }
    );
  }, [createMutation, createModal, form]);

  const handleUpdate = useCallback(
    (id: string, updates: Partial<StaffMember>) => {
      updateMutation.mutate(
        { id, updates },
        {
          onSuccess: () => {
            detailModal.close();
            toast.success("Staff updated");
          },
        }
      );
    },
    [updateMutation, detailModal]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this staff member?")) return;
      deleteMutation.mutate(id, {
        onSuccess: () => {
          detailModal.close();
          toast.success("Staff removed");
        },
      });
    },
    [deleteMutation, detailModal]
  );

  function initials(name = "") {
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Staff" />
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <PageHeader title="Staff" />
        <div style={{ padding: 12 }}>
          {(error instanceof Error && error.message) || "Failed to load staff"}
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
        <PageHeader title="Staff">
          <Button variation="primary" onClick={openCreate}>
            <Plus size={16} />
            New Staff
          </Button>
        </PageHeader>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search staff by name, role or email..."
        />
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          title={searchQuery ? "No staff found" : "No staff yet"}
        >
          {!searchQuery && <p>Click "New Staff" to add a team member.</p>}
        </EmptyState>
      ) : (
        <Grid>
          {filteredItems.map((s) => (
            <Card
              key={s.id}
              onClick={() => detailModal.open(s)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") detailModal.open(s);
              }}
              style={{ cursor: "pointer" }}
            >
              <Row>
                <Avatar>{initials(`${s.firstName ?? ""}`)}</Avatar>

                <div style={{ flex: 1 }}>
                  <Name>{`${s.firstName ?? ""}`.trim() || "Unnamed"}</Name>
                  <Sub>
                    {s.role ?? "—"} {s.email ? ` • ${s.email}` : ""}
                  </Sub>
                </div>
              </Row>
            </Card>
          ))}
        </Grid>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        title={
          detailModal.selectedItem
            ? `${detailModal.selectedItem.firstName ?? ""}`
            : "Staff"
        }
        size="md"
      >
        {detailModal.selectedItem ? (
          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>Role:</strong> {detailModal.selectedItem.role ?? "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Email:</strong> {detailModal.selectedItem.email ?? "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Phone:</strong> {detailModal.selectedItem.phone ?? "—"}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button
                variation="primary"
                onClick={() => {
                  const id = detailModal.selectedItem?.id;
                  if (!id) return;
                  // TODO: wire update form fields if you want inline edit
                  handleUpdate(id, { ...detailModal.selectedItem });
                }}
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

      {/* Create Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        title="Create staff"
        size="md"
      >
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="First name"
            value={form.firstName ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, firstName: e.target.value }))
            }
          />
          <input
            placeholder="Last name"
            value={form.lastName ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, lastName: e.target.value }))
            }
          />
          <input
            placeholder="Role"
            value={form.role ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
          <input
            placeholder="Email"
            value={form.email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            placeholder="Phone"
            value={form.phone ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button
              variation="primary"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              Create
            </Button>
            <Button onClick={createModal.close}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
