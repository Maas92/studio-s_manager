import React, { useState, useCallback } from "react";
import styled from "styled-components";
import {
  FileText,
  Plus,
  Calendar,
  TrendingUp,
  Eye,
  Trash2,
} from "lucide-react";
import Button from "../../ui/components/Button";
import Card from "../../ui/components/Card";
import EmptyState from "../../ui/components/EmptyState";
import type { StaffKPI } from "./StaffSchema";

interface StaffKPIListProps {
  kpis: StaffKPI[];
  onView: (kpi: StaffKPI) => void;
  onDelete?: (id: string) => void;
  onCreate: () => void;
  isAdmin?: boolean;
}

const Container = styled.div`
  display: grid;
  gap: 1.25rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KPICard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.25s;

  &:hover {
    transform: translateY(-2px);
  }
`;

const KPIHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const MonthLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};

  svg {
    color: ${({ theme }) => theme.color.brand600};
  }
`;

const StatusBadge = styled.div<{ $status: string }>`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $status, theme }) => {
    switch ($status) {
      case "completed":
        return theme.color.green100;
      case "reviewed":
        return theme.color.blue100;
      default:
        return theme.color.grey100;
    }
  }};
  color: ${({ $status, theme }) => {
    switch ($status) {
      case "completed":
        return theme.color.green700;
      case "reviewed":
        return theme.color.blue500;
      default:
        return theme.color.grey700;
    }
  }};
`;

const ScoreDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.brand50},
    ${({ theme }) => theme.color.blue100}
  );
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.brand200};
`;

const ScoreLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

const ScoreValue = styled.div<{ $score: number }>`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ $score, theme }) => {
    if ($score >= 4.5) return theme.color.green500;
    if ($score >= 3.5) return theme.color.blue500;
    if ($score >= 2.5) return theme.color.yellow700;
    return theme.color.red600;
  }};
  line-height: 1;
`;

const ScoreMax = styled.span`
  font-size: 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const ReviewerInfo = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

export default function StaffKPIList({
  kpis,
  onView,
  onDelete,
  onCreate,
  isAdmin = false,
}: StaffKPIListProps) {
  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this KPI record?")) {
        onDelete?.(id);
      }
    },
    [onDelete],
  );

  return (
    <Container>
      <Header>
        <Title>
          <FileText size={20} />
          Performance Reviews
        </Title>
        {isAdmin && (
          <Button variation="primary" onClick={onCreate}>
            <Plus size={16} />
            New Review
          </Button>
        )}
      </Header>

      {kpis.length === 0 ? (
        <EmptyState icon={FileText} title="No performance reviews yet">
          <p>Create your first performance review to track staff KPIs.</p>
        </EmptyState>
      ) : (
        <Grid>
          {kpis.map((kpi) => (
            <KPICard key={kpi.id} hoverable onClick={() => onView(kpi)}>
              <KPIHeader>
                <MonthLabel>
                  <Calendar size={16} />
                  {new Date(kpi.month + "-01").toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </MonthLabel>
                <StatusBadge $status={kpi.status}>{kpi.status}</StatusBadge>
              </KPIHeader>

              <ScoreDisplay>
                <ScoreLabel>Total Score</ScoreLabel>
                <ScoreValue $score={kpi.totalScore}>
                  {kpi.totalScore.toFixed(2)} <ScoreMax>/ 5.00</ScoreMax>
                </ScoreValue>
              </ScoreDisplay>

              <ReviewerInfo>
                Reviewed by: <strong>{kpi.reviewerName}</strong>
              </ReviewerInfo>

              {isAdmin && (
                <Actions>
                  <Button
                    variation="secondary"
                    onClick={() => onView(kpi)}
                    style={{ flex: 1 }}
                  >
                    <Eye size={14} />
                    View
                  </Button>
                  {onDelete && (
                    <Button
                      variation="danger"
                      onClick={(e) => handleDelete(e, kpi.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </Actions>
              )}
            </KPICard>
          ))}
        </Grid>
      )}
    </Container>
  );
}
