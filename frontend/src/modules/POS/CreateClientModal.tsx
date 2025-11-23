import React, { useState, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import { UserPlus, AlertCircle } from "lucide-react";
import type { CreateClientInput } from "./api";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (client: CreateClientInput) => void;
  submitting?: boolean;
}

const Content = styled.div`
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
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};
`;

const Required = styled.span`
  color: ${({ theme }) => theme.color.red500};
  margin-left: 0.25rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.red500};
  margin-top: 0.25rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
`;

const InfoText = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.mutedText};
  padding: 1rem;
  background: ${({ theme }) => theme.color.brand50};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.brand200};
`;

export default function CreateClientModal({
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
}: CreateClientModalProps) {
  const [formData, setFormData] = useState<CreateClientInput>({
    name: "",
    phone: "",
    email: "",
    loyaltyPoints: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;
    onSubmit(formData);
  }, [formData, validateForm, onSubmit]);

  const handleClose = useCallback(() => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      loyaltyPoints: 0,
    });
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Client"
      size="md"
      ariaLabel="Create new client"
    >
      <Content>
        <InfoText>
          Create a new client profile to track their appointments, purchases,
          and loyalty points.
        </InfoText>

        {/* Name */}
        <FormField>
          <Label htmlFor="client-name">
            Full Name
            <Required>*</Required>
          </Label>
          <Input
            id="client-name"
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="e.g., Sarah Johnson"
            autoFocus
          />
          {errors.name && (
            <ErrorMessage>
              <AlertCircle size={14} />
              {errors.name}
            </ErrorMessage>
          )}
        </FormField>

        {/* Phone */}
        <FormField>
          <Label htmlFor="client-phone">Phone Number</Label>
          <Input
            id="client-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, phone: e.target.value }));
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
            }}
            placeholder="e.g., 555-0101"
          />
          {errors.phone && (
            <ErrorMessage>
              <AlertCircle size={14} />
              {errors.phone}
            </ErrorMessage>
          )}
        </FormField>

        {/* Email */}
        <FormField>
          <Label htmlFor="client-email">Email Address</Label>
          <Input
            id="client-email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, email: e.target.value }));
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="e.g., sarah@email.com"
          />
          {errors.email && (
            <ErrorMessage>
              <AlertCircle size={14} />
              {errors.email}
            </ErrorMessage>
          )}
        </FormField>

        {/* Actions */}
        <Actions>
          <Button
            variation="secondary"
            onClick={handleClose}
            disabled={submitting}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Cancel
          </Button>
          <Button
            variation="primary"
            onClick={handleSubmit}
            disabled={submitting || !formData.name.trim()}
            icon={<UserPlus size={18} />}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {submitting ? "Creating..." : "Create Client"}
          </Button>
        </Actions>
      </Content>
    </Modal>
  );
}
