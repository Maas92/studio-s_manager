import React, { useState, useCallback, useEffect, useMemo } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { Client, CreateClientInput } from "./api";
import type { Appointment } from "../appointments/AppointmentsSchema";
import {
  Edit2,
  Save,
  X,
  Trash2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Gift,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  Star,
} from "lucide-react";

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onUpdate?: (id: string, values: Partial<CreateClientInput>) => void;
  onDelete?: (id: string) => void;
  onCreateAppointment?: (clientId: string, clientName: string) => void;
  updating?: boolean;
  deleting?: boolean;
  appointments?: Appointment[];
  isAdmin?: boolean;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const StatsSection = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const StatsTitle = styled.h4`
  margin: 0 0 1.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div<{ $variant?: "success" | "info" | "warning" }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-left: 3px solid
    ${({ $variant, theme }) => {
      switch ($variant) {
        case "success":
          return theme.color.green500;
        case "warning":
          return theme.color.yellow700;
        case "info":
          return theme.color.blue500;
        default:
          return theme.color.brand600;
      }
    }};
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatIcon = styled.div<{ $color?: string }>`
  color: ${({ $color }) => $color};
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.color.text};
  line-height: 1;
`;

const StatSubtext = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Form = styled.form`
  display: grid;
  gap: 1.25rem;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};
`;

const ReadOnlyField = styled.div`
  padding: 0.8rem 1.2rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.text};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.8rem 1.2rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  box-shadow: ${({ theme }) => theme.shadowSm};
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400};
  }

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const LeftActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const RightActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export default function ClientDetailModal({
  isOpen,
  onClose,
  client,
  onUpdate,
  onDelete,
  onCreateAppointment,
  updating = false,
  deleting = false,
  appointments = [],
  isAdmin = false,
}: ClientDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<CreateClientInput>({
    name: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    notes: "",
  });

  useEffect(() => {
    if (client) {
      setFormValues({
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        dateOfBirth: client.dateOfBirth || "",
        notes: client.notes || "",
      });
      setIsEditing(false);
    }
  }, [client]);

  const clientStats = useMemo(() => {
    if (!client) return null;

    const clientAppts = appointments.filter((a) => a.clientId === client.id);
    const completed = clientAppts.filter((a) => a.status === "completed");
    const totalSpent = completed.reduce((sum, appt) => {
      // Assuming you have price info - adjust as needed
      return sum + (appt.price || 0);
    }, 0);

    const now = Date.now();
    const upcoming = clientAppts.filter(
      (a) => new Date(a.datetimeISO).getTime() >= now
    );

    const lastVisit = completed.length
      ? new Date(
          Math.max(...completed.map((a) => new Date(a.datetimeISO).getTime()))
        )
      : null;

    return {
      totalAppointments: clientAppts.length,
      completed: completed.length,
      upcoming: upcoming.length,
      totalSpent,
      lastVisit,
      avgRating: 4.8, // This would come from your backend
    };
  }, [client, appointments]);

  const handleSave = useCallback(() => {
    if (!client) return;
    onUpdate?.(client.id, formValues);
    setIsEditing(false);
  }, [client, formValues, onUpdate]);

  const handleDelete = useCallback(() => {
    if (!client) return;
    if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
      onDelete?.(client.id);
    }
  }, [client, onDelete]);

  const handleCancel = useCallback(() => {
    if (client) {
      setFormValues({
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        dateOfBirth: client.dateOfBirth || "",
        notes: client.notes || "",
      });
    }
    setIsEditing(false);
  }, [client]);

  const handleCreateAppointment = useCallback(() => {
    if (!client) return;
    onCreateAppointment?.(client.id, client.name);
    onClose();
  }, [client, onCreateAppointment, onClose]);

  if (!client) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Client" : client.name}
      size="lg"
      ariaLabel="Client details"
    >
      <Content>
        {/* Client Stats - Owner Only */}
        {isAdmin && clientStats && !isEditing && (
          <StatsSection>
            <StatsTitle>
              <TrendingUp size={18} />
              Client Statistics
            </StatsTitle>
            <StatsGrid>
              {/* Total Appointments */}
              <StatCard $variant="info">
                <StatHeader>
                  <StatLabel>Appointments</StatLabel>
                  <StatIcon $color="#2563eb">
                    <Calendar size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#2563eb">
                  {clientStats.totalAppointments}
                </StatValue>
                <StatSubtext>{clientStats.completed} completed</StatSubtext>
              </StatCard>

              {/* Total Spent */}
              <StatCard $variant="success">
                <StatHeader>
                  <StatLabel>Lifetime Value</StatLabel>
                  <StatIcon $color="#15803d">
                    <DollarSign size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#15803d">
                  ${clientStats.totalSpent.toLocaleString()}
                </StatValue>
                <StatSubtext>total revenue</StatSubtext>
              </StatCard>

              {/* Upcoming */}
              <StatCard $variant="warning">
                <StatHeader>
                  <StatLabel>Upcoming</StatLabel>
                  <StatIcon $color="#ca8a04">
                    <Clock size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#ca8a04">{clientStats.upcoming}</StatValue>
                <StatSubtext>appointments</StatSubtext>
              </StatCard>

              {/* Loyalty Points */}
              <StatCard>
                <StatHeader>
                  <StatLabel>Loyalty Points</StatLabel>
                  <StatIcon $color="#c2a56f">
                    <Gift size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#c2a56f">
                  {client.loyaltyPoints || 0}
                </StatValue>
                <StatSubtext>points earned</StatSubtext>
              </StatCard>
            </StatsGrid>
          </StatsSection>
        )}

        <Form>
          {/* Name */}
          <FormField>
            <Label htmlFor="client-name">Name</Label>
            {isEditing ? (
              <Input
                id="client-name"
                value={formValues.name}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            ) : (
              <ReadOnlyField>{client.name}</ReadOnlyField>
            )}
          </FormField>

          <InfoGrid>
            {/* Email */}
            <FormField>
              <Label htmlFor="client-email">Email</Label>
              {isEditing ? (
                <Input
                  id="client-email"
                  type="email"
                  value={formValues.email ?? ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              ) : (
                <ReadOnlyField>
                  <Mail size={16} />
                  {client.email || "Not provided"}
                </ReadOnlyField>
              )}
            </FormField>

            {/* Phone */}
            <FormField>
              <Label htmlFor="client-phone">Phone</Label>
              {isEditing ? (
                <Input
                  id="client-phone"
                  type="tel"
                  value={formValues.phone ?? ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                />
              ) : (
                <ReadOnlyField>
                  <Phone size={16} />
                  {client.phone || "Not provided"}
                </ReadOnlyField>
              )}
            </FormField>
          </InfoGrid>

          {/* Address */}
          <FormField>
            <Label htmlFor="client-address">Address</Label>
            {isEditing ? (
              <Input
                id="client-address"
                value={formValues.address ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            ) : (
              <ReadOnlyField>
                <MapPin size={16} />
                {client.address || "Not provided"}
              </ReadOnlyField>
            )}
          </FormField>

          {/* Date of Birth */}
          <FormField>
            <Label htmlFor="client-dob">Date of Birth</Label>
            {isEditing ? (
              <Input
                id="client-dob"
                type="date"
                value={formValues.dateOfBirth ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    dateOfBirth: e.target.value,
                  }))
                }
              />
            ) : (
              <ReadOnlyField>
                <Gift size={16} />
                {client.dateOfBirth
                  ? new Date(client.dateOfBirth).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Not provided"}
              </ReadOnlyField>
            )}
          </FormField>

          {/* Loyalty Points (Read-only) */}
          {!isEditing && isAdmin && (
            <FormField>
              <Label>Loyalty Points</Label>
              <ReadOnlyField>
                <Gift size={16} />
                {client.loyaltyPoints || 0} points
              </ReadOnlyField>
            </FormField>
          )}

          {/* Last Visit */}
          {!isEditing && clientStats?.lastVisit && (
            <FormField>
              <Label>Last Visit</Label>
              <ReadOnlyField>
                <Calendar size={16} />
                {clientStats.lastVisit.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </ReadOnlyField>
            </FormField>
          )}

          {/* Notes */}
          <FormField>
            <Label htmlFor="client-notes">Notes</Label>
            {isEditing ? (
              <TextArea
                id="client-notes"
                value={formValues.notes ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Add notes about this client..."
              />
            ) : (
              <ReadOnlyField>
                <FileText size={16} />
                {client.notes || "No notes"}
              </ReadOnlyField>
            )}
          </FormField>

          {/* Actions */}
          <Actions>
            <LeftActions>
              {!isEditing && (
                <>
                  <Button
                    variation="primary"
                    type="button"
                    onClick={handleCreateAppointment}
                  >
                    <Calendar size={16} />
                    New Appointment
                  </Button>
                  {isAdmin && (
                    <Button
                      variation="danger"
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      <Trash2 size={16} />
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </>
              )}
            </LeftActions>

            <RightActions>
              {isEditing ? (
                <>
                  <Button
                    variation="secondary"
                    type="button"
                    onClick={handleCancel}
                  >
                    <X size={16} />
                    Cancel
                  </Button>
                  <Button
                    variation="primary"
                    type="button"
                    onClick={handleSave}
                    disabled={updating || !formValues.name}
                  >
                    <Save size={16} />
                    {updating ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variation="secondary" type="button" onClick={onClose}>
                    Close
                  </Button>
                  {isAdmin && (
                    <Button
                      variation="primary"
                      type="button"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 size={16} />
                      Edit
                    </Button>
                  )}
                </>
              )}
            </RightActions>
          </Actions>
        </Form>
      </Content>
    </Modal>
  );
}
