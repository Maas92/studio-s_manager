import React, { useState, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { CreateTreatmentInput } from "./api";

interface CreateTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (values: CreateTreatmentInput) => void;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
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

const INITIAL: CreateTreatmentInput = {
  name: "",
  description: "",
  durationMinutes: 60,
  price: 0,
  category: "",
  benefits: [],
  contraindications: [],
  preparationInstructions: "",
  aftercareInstructions: "",
  availableFor: [],
  imageUrl: "",
  isActive: true,
  tags: [],
};

export default function CreateTreatmentModal({
  isOpen,
  onClose,
  onCreate,
  creating = false,
}: CreateTreatmentModalProps) {
  const [formValues, setFormValues] = useState<CreateTreatmentInput>(INITIAL);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (
        !formValues.name ||
        !formValues.durationMinutes ||
        formValues.price < 0
      ) {
        // lightweight client guard; server-side validation will still run
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
      title="New Treatment"
      size="lg"
      ariaLabel="Create treatment"
    >
      <Form onSubmit={handleSubmit}>
        <FormField>
          <Label htmlFor="treatment-name">
            Name <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Input
            id="treatment-name"
            value={formValues.name}
            onChange={(e) =>
              setFormValues((p) => ({ ...p, name: e.target.value }))
            }
            required
            autoFocus
          />
        </FormField>

        <FormField>
          <Label htmlFor="treatment-description">Description</Label>
          <TextArea
            id="treatment-description"
            value={formValues.description}
            onChange={(e) =>
              setFormValues((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Describe the treatment..."
          />
        </FormField>

        <Grid>
          <FormField>
            <Label htmlFor="treatment-duration">
              Duration (minutes) <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Input
              id="treatment-duration"
              type="number"
              min={1}
              value={String(formValues.durationMinutes)}
              onChange={(e) =>
                setFormValues((p) => ({
                  ...p,
                  durationMinutes: Number(e.target.value),
                }))
              }
              required
            />
          </FormField>

          <FormField>
            <Label htmlFor="treatment-price">
              Price ($) <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Input
              id="treatment-price"
              type="number"
              step="0.01"
              min="0"
              value={String(formValues.price)}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, price: Number(e.target.value) }))
              }
              required
            />
          </FormField>
        </Grid>

        <FormField>
          <Label htmlFor="treatment-category">Category</Label>
          <Input
            id="treatment-category"
            value={formValues.category}
            onChange={(e) =>
              setFormValues((p) => ({ ...p, category: e.target.value }))
            }
          />
        </FormField>

        {/* Optional small inputs for tags (CSV) */}
        <FormField>
          <Label htmlFor="treatment-tags">Tags (comma separated)</Label>
          <Input
            id="treatment-tags"
            value={(formValues.tags || []).join(",")}
            onChange={(e) =>
              setFormValues((p) => ({
                ...p,
                tags: e.target.value
                  ? e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                  : [],
              }))
            }
            placeholder="relaxing, facial, beginner-friendly"
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
              !formValues.name ||
              formValues.durationMinutes < 1 ||
              formValues.price < 0
            }
          >
            {creating ? "Creating..." : "Create Treatment"}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
