import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Search,
  Clock,
  DollarSign,
  TrendingUp,
  Sparkles,
  Plus,
} from "lucide-react";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import EmptyState from "../../ui/components/EmptyState";
import TreatmentDetailModal from "./TreatmentDetailModal";
import CreateTreatmentModal from "./CreateTreatmentModal";
import SearchBar from "../../ui/components/SearchBar";

import { useTreatments } from "./useTreatments";
import { useListFilter } from "../../hooks/useListFilter";

import type { Treatment } from "./TreatmentSchema";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const TreatmentsList = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
`;

const Card = styled.div`
  padding: 1.25rem;
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.color.border};
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadowLg};
  }
`;

const Title = styled.h3`
  margin: 0 0 6px 0;
  font-size: 1.05rem;
  font-weight: 600;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
  color: ${({ theme }) => theme.color.mutedText};
  align-items: center;
`;

export default function Treatments() {
  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useTreatments();
  const treatments = listQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Treatment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { filteredItems } = useListFilter<Treatment>(treatments, {
    searchFields: ["name", "description", "category", "tags"],
    searchQuery,
  });

  // categories
  const categories = useMemo(() => {
    const set = new Set(
      (treatments || []).map((t) => t.category).filter(Boolean)
    );
    return ["all", ...Array.from(set)];
  }, [treatments]);

  const filtered = useMemo(() => {
    let items = filteredItems.filter((t) => t.isActive);
    if (categoryFilter !== "all")
      items = items.filter((t) => t.category === categoryFilter);
    return items.sort(
      (a, b) => (b.popularityScore || 0) - (a.popularityScore || 0)
    );
  }, [filteredItems, categoryFilter]);

  const openDetail = useCallback((t: Treatment) => {
    setSelected(t);
    setShowDetail(true);
  }, []);
  const handleCreate = useCallback(
    (payload: any) =>
      createMutation.mutate(payload, { onSuccess: () => setShowCreate(false) }),
    [createMutation]
  );
  const handleUpdate = useCallback(
    (id: string, updates: any) => updateMutation.mutate({ id, updates }),
    [updateMutation]
  );
  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this treatment?")) return;
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Treatments" />
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <PageHeader title="Treatments" />
        <div style={{ padding: 16 }}>
          {(error instanceof Error && error.message) ||
            "Failed to load treatments"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "transparent",
          zIndex: 5,
          paddingBottom: 12,
        }}
      >
        <PageHeader title="Treatments">
          <Button variation="primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Treatment
          </Button>
        </PageHeader>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search treatments..."
          />
          <div style={{ display: "flex", gap: 8 }}>
            {categories.map((c) => (
              <Button
                key={c}
                variation={categoryFilter === c ? "primary" : "secondary"}
                onClick={() => setCategoryFilter(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={
            searchQuery || categoryFilter !== "all"
              ? "No treatments found"
              : "No treatments available"
          }
        >
          {!searchQuery && categoryFilter === "all" && (
            <p>Add a new treatment to get started.</p>
          )}
        </EmptyState>
      ) : (
        <TreatmentsList>
          {filtered.map((t) => (
            <Card key={t.id} onClick={() => openDetail(t)}>
              <Title>{t.name}</Title>
              {t.description && (
                <div style={{ color: "var(--muted)", marginTop: 6 }}>
                  {t.description}
                </div>
              )}
              <MetaRow>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} /> {t.durationMinutes} min
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <DollarSign size={14} /> ${Number(t.price ?? 0).toFixed(2)}
                </div>
                {t.popularityScore && t.popularityScore > 80 && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <TrendingUp size={14} /> Popular
                  </div>
                )}
              </MetaRow>
            </Card>
          ))}
        </TreatmentsList>
      )}

      <TreatmentDetailModal
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelected(null);
        }}
        treatment={selected}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onBook={() => {
          /* optional: open appointment modal */
        }}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
      />

      <CreateTreatmentModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        creating={createMutation.isPending}
      />
    </PageWrapper>
  );
}
