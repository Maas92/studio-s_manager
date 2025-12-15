import React, { useState, useCallback, useEffect } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { Treatment, CreateTreatmentInput } from "./api";
import {
  Edit2,
  Save,
  X,
  Trash2,
  Calendar,
  Clock,
  DollarSign,
  Tags,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

interface TreatmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatment: Treatment | null;
  onUpdate?: (id: string, values: Partial<CreateTreatmentInput>) => void;
  onDelete?: (id: string) => void;
  onBook?: (treatmentId: string, treatmentName: string) => void;
  updating?: boolean;
  deleting?: boolean;
  isAdmin?: boolean;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const Section = styled.div`
  display: grid;
  gap: 1rem;
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  padding: 0.8rem 0;
  color: ${({ theme }) => theme.color.text};
  font-size: 0.95rem;
  line-height: 1.6;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InfoValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Tag = styled.span<{ $variant?: "default" | "benefit" | "warning" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case "benefit":
        return theme.color.green100 || "#dcfce7";
      case "warning":
        return theme.color.red100 || "#fee2e2";
      default:
        return theme.color.brand100 || "#dbeafe";
    }
  }};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case "benefit":
        return theme.color.green700 || "#15803d";
      case "warning":
        return theme.color.red600 || "#b91c1c";
      default:
        return theme.color.brand700 || "#1d4ed8";
    }
  }};
  border: 1px solid
    ${({ $variant, theme }) => {
      switch ($variant) {
        case "benefit":
          return theme.color.green100 || "#bbf7d0";
        case "warning":
          return theme.color.red200 || "#fecaca";
        default:
          return theme.color.brand200 || "#bfdbfe";
      }
    }};
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

const EditModeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export default function TreatmentDetailModal({
  isOpen,
  onClose,
  treatment,
  onUpdate,
  onDelete,
  onBook,
  updating = false,
  deleting = false,
  isAdmin = false,
}: TreatmentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<CreateTreatmentInput>({
    name: "",
    description: "",
    durationMinutes: 0,
    price: 0,
    category: "",
    benefits: [],
    contraindications: [],
    preparationInstructions: "",
    aftercareInstructions: "",
    isActive: true,
    tags: [],
  });

  useEffect(() => {
    if (treatment) {
      setFormValues({
        name: treatment.name,
        description: treatment.description || "",
        durationMinutes: treatment.durationMinutes,
        price: treatment.price,
        category: treatment.category || "",
        benefits: treatment.benefits || [],
        contraindications: treatment.contraindications || [],
        preparationInstructions: treatment.preparationInstructions || "",
        aftercareInstructions: treatment.aftercareInstructions || "",
        isActive: treatment.isActive,
        tags: treatment.tags || [],
      });
      setIsEditing(false);
    }
  }, [treatment]);

  const handleSave = useCallback(() => {
    if (!treatment || !isAdmin) return;
    onUpdate?.(treatment.id, formValues);
    setIsEditing(false);
  }, [treatment, formValues, onUpdate, isAdmin]);

  const handleDelete = useCallback(() => {
    if (!treatment || !isAdmin) return;
    if (
      window.confirm(`Are you sure you want to delete "${treatment.name}"?`)
    ) {
      onDelete?.(treatment.id);
    }
  }, [treatment, onDelete, isAdmin]);

  const handleCancel = useCallback(() => {
    if (treatment) {
      setFormValues({
        name: treatment.name,
        description: treatment.description || "",
        durationMinutes: treatment.durationMinutes,
        price: treatment.price,
        category: treatment.category || "",
        benefits: treatment.benefits || [],
        contraindications: treatment.contraindications || [],
        preparationInstructions: treatment.preparationInstructions || "",
        aftercareInstructions: treatment.aftercareInstructions || "",
        isActive: treatment.isActive,
        tags: treatment.tags || [],
      });
    }
    setIsEditing(false);
  }, [treatment]);

  const handleBook = useCallback(() => {
    if (!treatment) return;
    onBook?.(treatment.id, treatment.name);
    onClose();
  }, [treatment, onBook, onClose]);

  if (!treatment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Treatment" : treatment.name}
      size="lg"
      ariaLabel="Treatment details"
    >
      <Content>
        {!isEditing && (
          <InfoGrid>
            <InfoItem>
              <InfoLabel>Duration</InfoLabel>
              <InfoValue>
                <Clock size={20} />
                {treatment.durationMinutes} min
              </InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Price</InfoLabel>
              <InfoValue>
                <DollarSign size={20} />${treatment.price.toFixed(2)}
              </InfoValue>
            </InfoItem>
            {treatment.category && (
              <InfoItem>
                <InfoLabel>Category</InfoLabel>
                <InfoValue>
                  <Tags size={20} />
                  {treatment.category}
                </InfoValue>
              </InfoItem>
            )}
          </InfoGrid>
        )}

        {isEditing ? (
          <>
            <FormField>
              <Label htmlFor="treatment-name">Name</Label>
              <Input
                id="treatment-name"
                value={formValues.name}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </FormField>

            <FormField>
              <Label htmlFor="treatment-description">Description</Label>
              <TextArea
                id="treatment-description"
                value={formValues.description ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe this treatment..."
              />
            </FormField>

            <EditModeGrid>
              <FormField>
                <Label htmlFor="treatment-duration">Duration (minutes)</Label>
                <Input
                  id="treatment-duration"
                  type="number"
                  min="1"
                  value={formValues.durationMinutes}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                  required
                />
              </FormField>

              <FormField>
                <Label htmlFor="treatment-price">Price ($)</Label>
                <Input
                  id="treatment-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.price}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      price: Number(e.target.value),
                    }))
                  }
                  required
                />
              </FormField>

              <FormField>
                <Label htmlFor="treatment-category">Category</Label>
                <Input
                  id="treatment-category"
                  value={formValues.category ?? ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                />
              </FormField>
            </EditModeGrid>

            <FormField>
              <Label htmlFor="treatment-tags">Tags (comma separated)</Label>
              <Input
                id="treatment-tags"
                value={(formValues.tags || []).join(", ")}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    tags: e.target.value
                      ? e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                      : [],
                  }))
                }
                placeholder="relaxing, facial, popular"
              />
            </FormField>
          </>
        ) : (
          <>
            {treatment.description && (
              <Section>
                <ReadOnlyField>{treatment.description}</ReadOnlyField>
              </Section>
            )}

            {treatment.benefits && treatment.benefits.length > 0 && (
              <Section>
                <SectionTitle>
                  <CheckCircle size={18} />
                  Benefits
                </SectionTitle>
                <TagsContainer>
                  {treatment.benefits.map((benefit, idx) => (
                    <Tag key={idx} $variant="benefit">
                      <CheckCircle size={12} />
                      {benefit}
                    </Tag>
                  ))}
                </TagsContainer>
              </Section>
            )}

            {treatment.contraindications &&
              treatment.contraindications.length > 0 && (
                <Section>
                  <SectionTitle>
                    <AlertTriangle size={18} />
                    Contraindications
                  </SectionTitle>
                  <TagsContainer>
                    {treatment.contraindications.map((contra, idx) => (
                      <Tag key={idx} $variant="warning">
                        <AlertTriangle size={12} />
                        {contra}
                      </Tag>
                    ))}
                  </TagsContainer>
                </Section>
              )}

            {treatment.preparationInstructions && (
              <Section>
                <SectionTitle>
                  <Info size={18} />
                  Preparation Instructions
                </SectionTitle>
                <ReadOnlyField>
                  {treatment.preparationInstructions}
                </ReadOnlyField>
              </Section>
            )}

            {treatment.aftercareInstructions && (
              <Section>
                <SectionTitle>
                  <Info size={18} />
                  Aftercare Instructions
                </SectionTitle>
                <ReadOnlyField>{treatment.aftercareInstructions}</ReadOnlyField>
              </Section>
            )}

            {treatment.tags && treatment.tags.length > 0 && (
              <Section>
                <TagsContainer>
                  {treatment.tags.map((tag, idx) => (
                    <Tag key={idx}>{tag}</Tag>
                  ))}
                </TagsContainer>
              </Section>
            )}
          </>
        )}

        <Actions>
          <LeftActions>
            {!isEditing && isAdmin && (
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
                  disabled={
                    updating ||
                    !formValues.name ||
                    !formValues.durationMinutes ||
                    formValues.price < 0
                  }
                >
                  <Save size={16} />
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                {isAdmin && (
                  <Button
                    variation="secondary"
                    type="button"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 size={16} />
                    Edit
                  </Button>
                )}
                <Button variation="primary" type="button" onClick={handleBook}>
                  <Calendar size={16} />
                  Book This Treatment
                </Button>
              </>
            )}
          </RightActions>
        </Actions>
      </Content>
    </Modal>
  );
}
