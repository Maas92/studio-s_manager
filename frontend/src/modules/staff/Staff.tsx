import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import Card from "../../ui/components/Card";

import { useStaff } from "./useStaff";
import { useAppointments } from "../appointments/useAppointments";
import { useListFilter } from "../../hooks/useListFilter";
import { useModalState } from "../../hooks/useModalState";
import CreateStaffModal from "./CreateStaffModal";
import StaffDetailModal from "./StaffDetailModal";
import useAuth from "../../hooks/useAuth";

import type { StaffMember } from "./StaffSchema";

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

const StaffCard = styled(Card)`
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

const StaffHeader = styled.div`
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

const StaffInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const StaffName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;

const StaffRole = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  display: flex;
  align-items: center;
  gap: 0.375rem;

  svg {
    color: ${({ theme }) => theme.color.brand600};
    flex-shrink: 0;
  }
`;

const StatusBadge = styled.div<{ $status: "active" | "inactive" | "on_leave" }>`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $status, theme }) => {
    switch ($status) {
      case "active":
        return theme.color.green100 || "#dcfce7";
      case "inactive":
        return theme.color.grey100 || "#f3f4f6";
      case "on_leave":
        return theme.color.yellow100 || "#fef3c7";
      default:
        return theme.color.grey100;
    }
  }};
  color: ${({ $status, theme }) => {
    switch ($status) {
      case "active":
        return theme.color.green700 || "#15803d";
      case "inactive":
        return theme.color.grey700 || "#374151";
      case "on_leave":
        return theme.color.yellow700 || "#a16207";
      default:
        return theme.color.grey700;
    }
  }};
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

const SpecializationsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
`;

const SpecTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.color.blue100};
  color: ${({ theme }) => theme.color.blue500};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid ${({ theme }) => theme.color.blue100};

  svg {
    width: 12px;
    height: 12px;
  }
`;

function getInitials(firstName = "", lastName = "") {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

export default function StaffPage() {
  const navigate = useNavigate();
  const { canManageStaff, isAdmin } = useAuth();

  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useStaff();
  const { listQuery: apptQuery } = useAppointments();

  const staff = listQuery.data ?? [];
  const appointments = apptQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const [searchQuery, setSearchQuery] = useState("");

  const { filteredItems } = useListFilter<StaffMember>(staff, {
    searchFields: ["firstName", "lastName", "email", "phone", "role"],
  });

  const detailModal = useModalState<StaffMember>();
  const createModal = useModalState();

  const handleCreate = useCallback(
    (payload: any) => {
      createMutation.mutate(payload, {
        onSuccess: () => {
          createModal.close();
          toast.success("Staff member created successfully!");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to create staff member");
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
            toast.success("Staff member updated successfully!");
          },
          onError: (error: any) => {
            toast.error(error?.message ?? "Failed to update staff member");
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
          toast.success("Staff member removed successfully!");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to remove staff member");
        },
      });
    },
    [deleteMutation, detailModal]
  );

  const handleBookStaff = useCallback(
    (staffId: string, staffName: string) => {
      detailModal.close();

      navigate("/appointments", {
        state: {
          createAppointment: true,
          staffId,
          staffName,
        },
      });
    },
    [navigate, detailModal]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Staff" />
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
        <PageHeader title="Staff" />
        <div style={{ padding: "1rem", color: "var(--color-red500)" }}>
          {error instanceof Error ? error.message : "Failed to load staff"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ControlsWrapper>
        <PageHeader title="Staff">
          {canManageStaff && (
            <Button variation="primary" onClick={() => createModal.open()}>
              <Plus size={16} /> New Staff Member
            </Button>
          )}
        </PageHeader>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search staff by name, role, or email..."
        />
      </ControlsWrapper>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          title={searchQuery ? "No staff found" : "No staff yet"}
        >
          {!searchQuery && canManageStaff && (
            <p>Add your first team member to get started.</p>
          )}
        </EmptyState>
      ) : (
        <Grid>
          {filteredItems.map((member) => {
            const statusVariant = (
              ["active", "inactive", "on_leave"].includes(member.status)
                ? member.status
                : "active"
            ) as "active" | "inactive" | "on_leave";

            return (
              <StaffCard
                key={member.id}
                hoverable
                onClick={() => detailModal.open(member)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    detailModal.open(member);
                  }
                }}
              >
                <StaffHeader>
                  <Avatar>
                    {getInitials(member.firstName, member.lastName)}
                  </Avatar>
                  <StaffInfo>
                    <StaffName>
                      {member.firstName} {member.lastName}
                    </StaffName>
                    <StaffRole>
                      <Briefcase size={14} />
                      {member.role}
                    </StaffRole>
                  </StaffInfo>
                  <StatusBadge $status={statusVariant}>
                    {member.status.replace("_", " ")}
                  </StatusBadge>
                </StaffHeader>

                <ContactInfo>
                  {member.email && (
                    <ContactItem>
                      <Mail size={14} />
                      {member.email}
                    </ContactItem>
                  )}
                  {member.phone && (
                    <ContactItem>
                      <Phone size={14} />
                      {member.phone}
                    </ContactItem>
                  )}
                </ContactInfo>

                {member.specializations &&
                  member.specializations.length > 0 && (
                    <SpecializationsContainer>
                      {member.specializations.slice(0, 3).map((spec, idx) => (
                        <SpecTag key={idx}>
                          <Award size={12} />
                          {spec}
                        </SpecTag>
                      ))}
                      {member.specializations.length > 3 && (
                        <SpecTag>
                          +{member.specializations.length - 3} more
                        </SpecTag>
                      )}
                    </SpecializationsContainer>
                  )}
              </StaffCard>
            );
          })}
        </Grid>
      )}

      <StaffDetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        member={detailModal.selectedItem}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onBookStaff={handleBookStaff}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
        appointments={appointments}
        isAdmin={isAdmin}
      />

      {canManageStaff && (
        <CreateStaffModal
          isOpen={createModal.isOpen}
          onClose={createModal.close}
          onCreate={handleCreate}
          creating={createMutation.isPending}
        />
      )}
    </PageWrapper>
  );
}
