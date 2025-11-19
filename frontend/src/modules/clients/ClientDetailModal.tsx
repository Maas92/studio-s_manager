import React, { useState, useCallback, useEffect } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { Client, CreateClientInput } from "./api";
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
}

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
  transition: box-shadow 0.12s ease, border-color 0.12s ease;
  box-sizing: border-box;

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding-top: 1rem;
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
      title={isEditing ? "Edit Client" : "Client Details"}
      size="md"
      ariaLabel="Client details"
    >
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
                value={formValues.email}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, email: e.target.value }))
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
                value={formValues.phone}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, phone: e.target.value }))
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
              value={formValues.address}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, address: e.target.value }))
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
              value={formValues.dateOfBirth}
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
        {!isEditing && (
          <FormField>
            <Label>Loyalty Points</Label>
            <ReadOnlyField>
              <Gift size={16} />
              {client.loyaltyPoints || 0} points
            </ReadOnlyField>
          </FormField>
        )}

        {/* Notes */}
        <FormField>
          <Label htmlFor="client-notes">Notes</Label>
          {isEditing ? (
            <TextArea
              id="client-notes"
              value={formValues.notes}
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
                <Button
                  variation="danger"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 size={16} />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
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
                <Button
                  variation="primary"
                  type="button"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 size={16} />
                  Edit
                </Button>
              </>
            )}
          </RightActions>
        </Actions>
      </Form>
    </Modal>
  );
}
