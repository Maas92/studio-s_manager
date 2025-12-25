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
  gap: 1.5rem;
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
  color: ${({ theme }) => theme.color.red500};
  margin-left: 4px;
`;

const Grid = styled.div`
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400};
  }

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
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

  &:hover:not(:focus) {
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
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const INITIAL: CreateStaffMemberInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
  specializations: [],
  status: "active",
  hireDate: "",
  bio: "",
  certifications: [],
  hourlyRate: 0,
  commissionRate: 0,
};

export default function CreateStaffModal({
  isOpen,
  onClose,
  onCreate,
  creating = false,
}: CreateStaffModalProps) {
  const [formValues, setFormValues] = useState<CreateStaffMemberInput>(INITIAL);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formValues.firstName || !formValues.lastName || !formValues.role) {
        return;
      }
      onCreate(formValues);
    },
    [formValues, onCreate]
  );

  const handleClose = useCallback(() => {
    setFormValues(INITIAL);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Staff Member"
      size="lg"
      ariaLabel="Create staff member"
    >
      <Form onSubmit={handleSubmit}>
        <Grid>
          <FormField>
            <Label htmlFor="staff-first-name">
              First Name <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Input
              id="staff-first-name"
              value={formValues.firstName}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, firstName: e.target.value }))
              }
              placeholder="e.g., John"
              required
              autoFocus
            />
          </FormField>

          <FormField>
            <Label htmlFor="staff-last-name">
              Last Name <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Input
              id="staff-last-name"
              value={formValues.lastName}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, lastName: e.target.value }))
              }
              placeholder="e.g., Doe"
              required
            />
          </FormField>
        </Grid>

        <FormField>
          <Label htmlFor="staff-role">
            Role <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Input
            id="staff-role"
            value={formValues.role}
            onChange={(e) =>
              setFormValues((p) => ({ ...p, role: e.target.value }))
            }
            placeholder="e.g., Massage Therapist, Aesthetician"
            required
          />
        </FormField>

        <Grid>
          <FormField>
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={formValues.email}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="email@example.com"
            />
          </FormField>

          <FormField>
            <Label htmlFor="staff-phone">Phone</Label>
            <Input
              id="staff-phone"
              type="tel"
              value={formValues.phone}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="+1 (555) 123-4567"
            />
          </FormField>
        </Grid>

        <Grid>
          <FormField>
            <Label htmlFor="staff-status">Status</Label>
            <Select
              id="staff-status"
              value={formValues.status}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, status: e.target.value as any }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </Select>
          </FormField>

          <FormField>
            <Label htmlFor="staff-hire-date">Hire Date</Label>
            <Input
              id="staff-hire-date"
              type="date"
              value={formValues.hireDate}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, hireDate: e.target.value }))
              }
            />
          </FormField>
        </Grid>

        <Grid>
          <FormField>
            <Label htmlFor="staff-hourly-rate">Hourly Rate ($)</Label>
            <Input
              id="staff-hourly-rate"
              type="number"
              step="0.01"
              min="0"
              value={formValues.hourlyRate ?? 0}
              onChange={(e) =>
                setFormValues((p) => ({
                  ...p,
                  hourlyRate: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0.00"
            />
          </FormField>

          <FormField>
            <Label htmlFor="staff-commission-rate">Commission Rate (%)</Label>
            <Input
              id="staff-commission-rate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formValues.commissionRate ?? 0}
              onChange={(e) =>
                setFormValues((p) => ({
                  ...p,
                  commissionRate: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0.0"
            />
          </FormField>
        </Grid>

        <FormField>
          <Label htmlFor="staff-bio">Bio</Label>
          <TextArea
            id="staff-bio"
            value={formValues.bio}
            onChange={(e) =>
              setFormValues((p) => ({ ...p, bio: e.target.value }))
            }
            placeholder="Tell us about this team member..."
          />
        </FormField>

        <Actions>
          <Button variation="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variation="primary"
            type="submit"
            disabled={
              creating ||
              !formValues.firstName ||
              !formValues.lastName ||
              !formValues.role
            }
          >
            {creating ? "Creating..." : "Create Staff Member"}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
