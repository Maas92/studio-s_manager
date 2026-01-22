import React, { useState, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { CreateClientInput } from "../clients/api";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (values: CreateClientInput) => void;
  creating?: boolean;
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

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.color.red500 || "#ef4444"};
  margin-left: 4px;
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
  transition:
    box-shadow 0.12s ease,
    border-color 0.12s ease;
  box-sizing: border-box;

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const INITIAL_FORM_STATE: CreateClientInput = {
  name: "",
  email: "",
  phone: "",
  address: "",
  dateOfBirth: "",
  notes: "",
};

export default function CreateClientModal({
  isOpen,
  onClose,
  onCreate,
  creating = false,
}: CreateClientModalProps) {
  const [formValues, setFormValues] =
    useState<CreateClientInput>(INITIAL_FORM_STATE);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formValues.name) return;
      onCreate(formValues);
    },
    [formValues, onCreate],
  );

  const handleClose = useCallback(() => {
    setFormValues(INITIAL_FORM_STATE);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Client"
      size="md"
      ariaLabel="Create new client"
    >
      <Form onSubmit={handleSubmit}>
        {/* Name */}
        <FormField>
          <Label htmlFor="new-client-name">
            Name
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Input
            id="new-client-name"
            value={formValues.name}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter client name"
            required
            autoFocus
          />
        </FormField>

        <InfoGrid>
          {/* Email */}
          <FormField>
            <Label htmlFor="new-client-email">Email</Label>
            <Input
              id="new-client-email"
              type="email"
              value={formValues.email ?? ""}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="client@example.com"
            />
          </FormField>

          {/* Phone */}
          <FormField>
            <Label htmlFor="new-client-phone">Phone</Label>
            <Input
              id="new-client-phone"
              type="tel"
              value={formValues.phone ?? ""}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+1 (555) 000-0000"
            />
          </FormField>
        </InfoGrid>

        {/* Address */}
        <FormField>
          <Label htmlFor="new-client-address">Address</Label>
          <Input
            id="new-client-address"
            value={formValues.address ?? ""}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, address: e.target.value }))
            }
            placeholder="123 Main St, City, State"
          />
        </FormField>

        {/* Date of Birth */}
        <FormField>
          <Label htmlFor="new-client-dob">Date of Birth</Label>
          <Input
            id="new-client-dob"
            type="date"
            value={formValues.dateOfBirth ?? ""}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                dateOfBirth: e.target.value,
              }))
            }
          />
        </FormField>

        {/* Notes */}
        <FormField>
          <Label htmlFor="new-client-notes">Notes</Label>
          <TextArea
            id="new-client-notes"
            value={formValues.notes ?? ""}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Add any notes about this client..."
          />
        </FormField>

        {/* Actions */}
        <Actions>
          <Button
            variation="secondary"
            type="button"
            onClick={handleClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            variation="primary"
            type="submit"
            disabled={creating || !formValues.name}
          >
            {creating ? "Creating..." : "Create Client"}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
