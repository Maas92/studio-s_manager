import React, { useState, useCallback, useEffect, useRef } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import { Save, Printer, FileText, X } from "lucide-react";
import type { StaffMember } from "./StaffSchema";
import type {
  StaffKPI,
  KPICategory,
  KPIItem,
  CreateStaffKPIInput,
} from "./StaffSchema";
import { DEFAULT_KPI_TEMPLATE } from "./StaffSchema";
import { useReactToPrint } from "react-to-print";

interface StaffKPIModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember;
  kpi?: StaffKPI | null;
  onSave: (data: CreateStaffKPIInput) => void;
  currentUser: { id: string; name: string };
  saving?: boolean;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const CategorySection = styled.div`
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 1.25rem;
  background: ${({ theme }) => theme.color.panel};

  @media print {
    page-break-inside: avoid;
    border: 1px solid #000;
  }
`;

const CategoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid ${({ theme }) => theme.color.brand600};
`;

const CategoryTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

const CategoryWeight = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.brand600};
  background: ${({ theme }) => theme.color.brand100};
  padding: 0.25rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.round};
`;

const KPIItemRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.grey200};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const ItemLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.text};
`;

const ScoreInput = styled.select`
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.brand600};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
  }

  @media print {
    border: 1px solid #000;
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
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  transition: all 0.2s;

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const TotalScoreSection = styled.div`
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.brand50},
    ${({ theme }) => theme.color.blue100}
  );
  border: 2px solid ${({ theme }) => theme.color.brand600};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 1.5rem;
  text-align: center;

  @media print {
    border: 2px solid #000;
    background: #f0f0f0;
  }
`;

const TotalScoreLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
`;

const TotalScoreValue = styled.div`
  font-size: 3rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.brand700};
  line-height: 1;
`;

const TotalScoreMax = styled.span`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};

  @media print {
    display: none;
  }
`;

const PrintWrapper = styled.div`
  @media print {
    padding: 2rem;
  }
`;

const PrintHeader = styled.div`
  display: none;

  @media print {
    display: block;
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 3px solid #000;
  }
`;

const PrintTitle = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
`;

const PrintSubtitle = styled.div`
  font-size: 1rem;
  color: #666;
`;

const PrintInfo = styled.div`
  display: none;

  @media print {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1rem;
    background: #f9f9f9;
    border: 1px solid #000;
  }
`;

const PrintInfoItem = styled.div`
  strong {
    display: inline-block;
    min-width: 100px;
  }
`;

const StatusBadge = styled.select`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

export default function StaffKPIModal({
  isOpen,
  onClose,
  staff,
  kpi,
  onSave,
  currentUser,
  saving = false,
}: StaffKPIModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [formData, setFormData] = useState<CreateStaffKPIInput>({
    staffId: staff.id || "",
    month: kpi?.month || currentMonth,
    reviewerId: kpi?.reviewerId || currentUser.id,
    reviewerName: kpi?.reviewerName || currentUser.name,
    categories:
      kpi?.categories ||
      DEFAULT_KPI_TEMPLATE.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({ ...item })),
      })),
    comments: kpi?.comments || "",
    status: kpi?.status || "draft",
  });

  useEffect(() => {
    if (kpi) {
      setFormData({
        staffId: kpi.staffId,
        month: kpi.month,
        reviewerId: kpi.reviewerId,
        reviewerName: kpi.reviewerName,
        categories: kpi.categories,
        comments: kpi.comments || "",
        status: kpi.status,
      });
    }
  }, [kpi]);

  const calculateTotalScore = useCallback(() => {
    let totalScore = 0;

    for (const category of formData.categories) {
      const validScores = category.items.filter((item) => item.score !== null);
      if (validScores.length === 0) continue;

      const categoryAvg =
        validScores.reduce((sum, item) => sum + (item.score || 0), 0) /
        validScores.length;
      totalScore += categoryAvg * category.weight;
    }

    return Math.round(totalScore * 100) / 100;
  }, [formData.categories]);

  const handleScoreChange = useCallback(
    (categoryIndex: number, itemIndex: number, score: number | null) => {
      setFormData((prev) => {
        const newCategories = [...prev.categories];
        newCategories[categoryIndex] = {
          ...newCategories[categoryIndex],
          items: newCategories[categoryIndex].items.map((item, idx) =>
            idx === itemIndex ? { ...item, score } : item,
          ),
        };
        return { ...prev, categories: newCategories };
      });
    },
    [],
  );

  const handleSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    },
    [formData, onSave],
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `KPI_${staff.firstName}_${staff.lastName}_${formData.month}`,
  });

  const totalScore = calculateTotalScore();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Performance Review - ${staff.firstName} ${staff.lastName}`}
      size="lg"
      ariaLabel="Staff KPI form"
    >
      <PrintWrapper ref={printRef}>
        <PrintHeader>
          <PrintTitle>Staff Performance Review</PrintTitle>
          <PrintSubtitle>Comprehensive KPI Evaluation</PrintSubtitle>
        </PrintHeader>

        <PrintInfo>
          <PrintInfoItem>
            <strong>Staff Member:</strong> {staff.firstName} {staff.lastName}
          </PrintInfoItem>
          <PrintInfoItem>
            <strong>Role:</strong> {staff.role}
          </PrintInfoItem>
          <PrintInfoItem>
            <strong>Review Month:</strong>{" "}
            {new Date(formData.month + "-01").toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </PrintInfoItem>
          <PrintInfoItem>
            <strong>Reviewer:</strong> {formData.reviewerName}
          </PrintInfoItem>
          <PrintInfoItem>
            <strong>Status:</strong> {formData.status}
          </PrintInfoItem>
          <PrintInfoItem>
            <strong>Date:</strong> {new Date().toLocaleDateString()}
          </PrintInfoItem>
        </PrintInfo>

        <Form onSubmit={handleSave}>
          <Grid>
            <FormField>
              <Label>Review Month</Label>
              <Input
                type="month"
                value={formData.month}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, month: e.target.value }))
                }
                required
              />
            </FormField>

            <FormField>
              <Label>Status</Label>
              <StatusBadge
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as any,
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
                <option value="reviewed">Reviewed</option>
              </StatusBadge>
            </FormField>
          </Grid>

          {formData.categories.map((category, catIndex) => (
            <CategorySection key={catIndex}>
              <CategoryHeader>
                <CategoryTitle>{category.category}</CategoryTitle>
                <CategoryWeight>
                  Weight: {(category.weight * 100).toFixed(0)}%
                </CategoryWeight>
              </CategoryHeader>

              {category.items.map((item, itemIndex) => (
                <KPIItemRow key={itemIndex}>
                  <ItemLabel>{item.name}</ItemLabel>
                  <ScoreInput
                    value={item.score ?? ""}
                    onChange={(e) =>
                      handleScoreChange(
                        catIndex,
                        itemIndex,
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">-</option>
                    <option value="1">1 - Poor</option>
                    <option value="2">2 - Below Average</option>
                    <option value="3">3 - Average</option>
                    <option value="4">4 - Good</option>
                    <option value="5">5 - Excellent</option>
                  </ScoreInput>
                </KPIItemRow>
              ))}
            </CategorySection>
          ))}

          <TotalScoreSection>
            <TotalScoreLabel>Total Performance Score</TotalScoreLabel>
            <TotalScoreValue>
              {totalScore.toFixed(2)} <TotalScoreMax>/ 5.00</TotalScoreMax>
            </TotalScoreValue>
          </TotalScoreSection>

          <FormField>
            <Label>Additional Comments</Label>
            <TextArea
              value={formData.comments}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, comments: e.target.value }))
              }
              placeholder="Add any additional feedback or notes here..."
            />
          </FormField>

          <Actions>
            <Button variation="secondary" type="button" onClick={onClose}>
              <X size={16} />
              Cancel
            </Button>
            <Button variation="secondary" type="button" onClick={handlePrint}>
              <Printer size={16} />
              Print
            </Button>
            <Button variation="primary" type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : "Save KPI"}
            </Button>
          </Actions>
        </Form>
      </PrintWrapper>
    </Modal>
  );
}
