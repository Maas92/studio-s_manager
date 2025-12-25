import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Clock as ClockIcon,
  DollarSign as DollarIcon,
  TrendingUp,
  Sparkles,
  Tag as TagIcon,
} from "lucide-react";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import Card from "../../ui/components/Card";

import { useTreatments } from "./useTreatments";
import { useListFilter } from "../../hooks/useListFilter";
import CreateTreatmentModal from "./CreateTreatmentModal";
import TreatmentDetailModal from "./TreatmentDetailModal";
import useAuth from "../../hooks/useAuth";

import type { Treatment } from "./TreatmentSchema";
import { useModalState } from "../../hooks/useModalState";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const ControlsWrapper = styled.div`
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.color.bg};
  z-index: 5;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-top: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const CategoryFilters = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Grid = styled.div`
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TreatmentCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  height: 100%;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.color.brand400},
      ${({ theme }) => theme.color.brand600}
    );
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const TreatmentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
`;

const TreatmentTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  line-height: 1.3;
  flex: 1;
`;

const PopularBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.brand100},
    ${({ theme }) => theme.color.brand200}
  );
  color: ${({ theme }) => theme.color.brand800};
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.color.brand300};
`;

const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.color.text};
  font-size: 0.875rem;
  font-weight: 500;

  svg {
    color: ${({ theme }) => theme.color.brand600};
    flex-shrink: 0;
  }
`;

const TagsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.color.grey100};
  color: ${({ theme }) => theme.color.grey700};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid ${({ theme }) => theme.color.border};

  svg {
    width: 12px;
    height: 12px;
  }
`;

export default function TreatmentsPage() {
  const navigate = useNavigate();
  const { canManageTreatments, isAdmin, isOwner } = useAuth();

  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useTreatments();
  const treatments = listQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { filteredItems } = useListFilter<Treatment>(treatments, {
    searchFields: ["name", "description", "category", "tags"],
  });

  const categories = useMemo(() => {
    const categorySet = new Set(
      treatments.map((t) => t.category).filter(Boolean)
    );
    return ["all", ...Array.from(categorySet)];
  }, [treatments]);

  const filtered = useMemo(() => {
    let items = filteredItems.filter((t) => t.isActive);
    if (categoryFilter !== "all") {
      items = items.filter((t) => t.category === categoryFilter);
    }
    return items.sort(
      (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0)
    );
  }, [filteredItems, categoryFilter]);

  const detailModal = useModalState<Treatment>();
  const createModal = useModalState();

  const handleCreate = useCallback(
    (payload: any) => {
      createMutation.mutate(payload, {
        onSuccess: () => {
          createModal.close();
        },
      });
    },
    [createMutation, createModal]
  );

  const handleUpdate = useCallback(
    (id: string, updates: any) => {
      updateMutation.mutate(
        { id, updates },
        {
          onSuccess: () => {
            detailModal.close();
          },
        }
      );
    },
    [updateMutation, detailModal]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          detailModal.close();
        },
      });
    },
    [deleteMutation, detailModal]
  );

  const handleBook = useCallback(
    (treatmentId: string, treatmentName: string) => {
      detailModal.close();
      // Navigate to appointments page with pre-filled treatment
      navigate("/appointments", {
        state: {
          createAppointment: true,
          treatmentId,
          treatmentName,
        },
      });
    },
    [navigate]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Treatments" />
        <div
          style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
        >
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <PageHeader title="Treatments" />
        <div style={{ padding: "1rem", color: "var(--color-red500)" }}>
          {error instanceof Error ? error.message : "Failed to load treatments"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ControlsWrapper>
        <PageHeader title="Treatments">
          {canManageTreatments && (
            <Button variation="primary" onClick={() => createModal.open()}>
              <Plus size={16} /> New Treatment
            </Button>
          )}
        </PageHeader>

        <FiltersRow>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search treatments..."
          />
          <CategoryFilters>
            {categories.map((cat: any) => (
              <Button
                key={cat}
                size="small"
                variation={categoryFilter === cat ? "primary" : "secondary"}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </Button>
            ))}
          </CategoryFilters>
        </FiltersRow>
      </ControlsWrapper>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={
            searchQuery || categoryFilter !== "all"
              ? "No treatments found"
              : "No treatments available"
          }
        >
          {!searchQuery && categoryFilter === "all" && canManageTreatments && (
            <p>Add a new treatment to get started.</p>
          )}
        </EmptyState>
      ) : (
        <Grid>
          {filtered.map((treatment) => (
            <TreatmentCard
              key={treatment.id}
              hoverable
              onClick={() => detailModal.open(treatment)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  detailModal.open(treatment);
                }
              }}
            >
              <TreatmentHeader>
                <TreatmentTitle>{treatment.name}</TreatmentTitle>
                {treatment.popularityScore &&
                  treatment.popularityScore > 80 && (
                    <PopularBadge>
                      <TrendingUp size={12} />
                      Popular
                    </PopularBadge>
                  )}
              </TreatmentHeader>

              {treatment.description && (
                <Description>{treatment.description}</Description>
              )}

              {treatment.tags && treatment.tags.length > 0 && (
                <TagsList>
                  {treatment.tags.slice(0, 3).map((tag, idx) => (
                    <Tag key={idx}>
                      <TagIcon size={12} />
                      {tag}
                    </Tag>
                  ))}
                  {treatment.tags.length > 3 && (
                    <Tag>+{treatment.tags.length - 3} more</Tag>
                  )}
                </TagsList>
              )}

              <MetaGrid>
                <MetaItem>
                  <ClockIcon size={16} />
                  {treatment.durationMinutes} min
                </MetaItem>
                <MetaItem>
                  <DollarIcon size={16} />${treatment.price.toFixed(2)}
                </MetaItem>
              </MetaGrid>
            </TreatmentCard>
          ))}
        </Grid>
      )}

      <TreatmentDetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        treatment={detailModal.selectedItem}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onBook={handleBook}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
        isAdmin={canManageTreatments}
      />

      {canManageTreatments && (
        <CreateTreatmentModal
          isOpen={createModal.isOpen}
          onClose={createModal.close}
          onCreate={handleCreate}
          creating={createMutation.isPending}
        />
      )}
    </PageWrapper>
  );
}
