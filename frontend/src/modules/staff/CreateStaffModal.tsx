import React, { useState, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { CreateStaffMemberInput } from "./api";

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (values: CreateStaffMemberInput) => void;
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

const Select = styled.select`
  width: 100%;
  min-height: 46px;
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
  cursor: pointer;
  transition: box-shadow 0.12s ease, border-color 0.12s ease;

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const INITIAL_FORM_STATE: CreateStaffMemberInput = {
  name: "",
  email: "",
  phone: "",
  role: "",
  specializations: [],
  status: "active",
  hireDate: "",
  bio: "",
  certifications: [],
};

export default function CreateStaffModal({
  isOpen,
  onClose,
  onCreate,
  creating = false,
}: CreateStaffModalProps) {
  const [formValues, setFormValues] =
    useState<CreateStaffMemberInput>(INITIAL_FORM_STATE);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formValues.name || !formValues.role) return;
      onCreate(formValues);
    },
    [formValues, onCreate]
  );

  const handleClose = useCallback(() => {
    setFormValues(INITIAL_FORM_STATE);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Staff Member"
      size="md"
      ariaLabel="Add new staff member"
    >
      <Form onSubmit={handleSubmit}>
        {/* Name */}
        <FormField>
          <Label htmlFor="new-staff-name">
            Name
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Input
            id="new-staff-name"
            value={formValues.name}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter staff member name"
            required
            autoFocus
          />
        </FormField>

        <InfoGrid>
          {/* Email */}
          <FormField>
            <Label htmlFor="new-staff-email">Email</Label>
            <Input
              id="new-staff-email"
              type="email"
              value={formValues.email}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="staff@example.com"
            />
          </FormField>

          {/* Phone */}
          <FormField>
            <Label htmlFor="new-staff-phone">Phone</Label>
            <Input
              id="new-staff-phone"
              type="tel"
              value={formValues.phone}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+1 (555) 000-0000"
            />
          </FormField>
        </InfoGrid>

        <InfoGrid>
          {/* Role */}
          <FormField>
            <Label htmlFor="new-staff-role">
              Role
              <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Input
              id="new-staff-role"
              value={formValues.role}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, role: e.target.value }))
              }
              placeholder="e.g., Massage Therapist"
              required
            />
          </FormField>

          {/* Status */}
          <FormField>
            <Label htmlFor="new-staff-status">Status</Label>
            <Select
              id="new-staff-status"
              value={formValues.status}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  status: e.target.value as any,
                }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </Select>
          </FormField>
        </InfoGrid>

        {/* Hire Date */}
        <FormField>
          <Label htmlFor="new-staff-hire-date">Hire Date</Label>
          <Input
            id="new-staff-hire-date"
            type="date"
            value={formValues.hireDate}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, hireDate: e.target.value }))
            }
          />
        </FormField>

        {/* Bio */}
        <FormField>
          <Label htmlFor="new-staff-bio">Bio</Label>
          <TextArea
            id="new-staff-bio"
            value={formValues.bio}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, bio: e.target.value }))
            }
            placeholder="Add a brief bio about this staff member..."
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
            disabled={creating || !formValues.name || !formValues.role}
          >
            {creating ? "Adding..." : "Add Staff Member"}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
