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

  &::placeholder {
    color: ${({ theme }) => theme.color.mutedText};
    opacity: 0.7;
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

const HintText = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-top: 0.25rem;
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 1rem;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};

  input[type="radio"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
    accent-color: ${({ theme }) => theme.color.brand600};
  }
`;

const INITIAL: CreateTreatmentInput = {
  name: "",
  description: "",
  durationMinutes: 60,
  price: 0,
  pricingType: "fixed",
  priceRangeMax: undefined,
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
            Treatment Name <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Input
            id="treatment-name"
            value={formValues.name}
            onChange={(e) =>
              setFormValues((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="e.g., Swedish Massage"
            required
            autoFocus
          />
        </FormField>

        <FormField>
          <Label htmlFor="treatment-description">Description</Label>
          <TextArea
            id="treatment-description"
            value={formValues.description ?? ""}
            onChange={(e) =>
              setFormValues((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Describe what makes this treatment special..."
          />
        </FormField>

        <Grid>
          <FormField>
            <Label htmlFor="treatment-duration">
              Duration <RequiredIndicator>*</RequiredIndicator>
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
              placeholder="60"
              required
            />
            <HintText>Duration in minutes</HintText>
          </FormField>

          <FormField>
            <Label htmlFor="treatment-category">Category</Label>
            <Input
              id="treatment-category"
              value={formValues.category ?? ""}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="e.g., Massage, Facial"
            />
          </FormField>
        </Grid>

        <FormField>
          <Label>
            Pricing Type <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <RadioGroup>
            <RadioOption>
              <input
                type="radio"
                name="pricingType"
                value="fixed"
                checked={formValues.pricingType === "fixed"}
                onChange={(e) =>
                  setFormValues((p) => ({
                    ...p,
                    pricingType: "fixed",
                    priceRangeMax: undefined,
                  }))
                }
              />
              Fixed Price
            </RadioOption>
            <RadioOption>
              <input
                type="radio"
                name="pricingType"
                value="from"
                checked={formValues.pricingType === "from"}
                onChange={(e) =>
                  setFormValues((p) => ({ ...p, pricingType: "from" }))
                }
              />
              From Price (Starting at)
            </RadioOption>
          </RadioGroup>
          <HintText>
            {formValues.pricingType === "fixed"
              ? "Exact price for this treatment"
              : "Starting price - actual price varies"}
          </HintText>
        </FormField>

        <Grid>
          <FormField>
            <Label htmlFor="treatment-price">
              {formValues.pricingType === "from" ? "Starting Price" : "Price"}{" "}
              <RequiredIndicator>*</RequiredIndicator>
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
              placeholder="0.00"
              required
            />
            <HintText>
              {formValues.pricingType === "from"
                ? "Minimum/starting price"
                : "Price in USD"}
            </HintText>
          </FormField>

          {formValues.pricingType === "from" && (
            <FormField>
              <Label htmlFor="treatment-price-max">Maximum Price</Label>
              <Input
                id="treatment-price-max"
                type="number"
                step="0.01"
                min={formValues.price}
                value={
                  formValues.priceRangeMax !== undefined
                    ? String(formValues.priceRangeMax)
                    : ""
                }
                onChange={(e) =>
                  setFormValues((p) => ({
                    ...p,
                    priceRangeMax: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="Optional"
              />
              <HintText>Optional - for displaying price range</HintText>
            </FormField>
          )}
        </Grid>

        <FormField>
          <Label htmlFor="treatment-tags">Tags</Label>
          <Input
            id="treatment-tags"
            value={(formValues.tags || []).join(", ")}
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
            placeholder="relaxing, popular, beginner-friendly"
          />
          <HintText>Separate tags with commas</HintText>
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
