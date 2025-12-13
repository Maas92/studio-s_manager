import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Plus,
  Search as SearchIcon,
  Clock as ClockIcon,
  DollarSign as DollarIcon,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import Card from "../../ui/components/Card";
import Modal from "../../ui/components/Modal";

import { useTreatments } from "./useTreatments";
import { useListFilter } from "../../hooks/useListFilter";

import type { Treatment } from "./TreatmentSchema";
import { useModalState } from "../../hooks/useModalState";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
`;

const Title = styled.h4`
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

export default function TreatmentsPage() {
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
    const s = new Set(
      (treatments || []).map((t) => t.category).filter(Boolean)
    );
    return ["all", ...Array.from(s)];
  }, [treatments]);

  const filtered = useMemo(() => {
    let items = (filteredItems ?? []).filter((t) => t.isActive);
    if (categoryFilter !== "all")
      items = items.filter((t) => t.category === categoryFilter);
    return items.sort(
      (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0)
    );
  }, [filteredItems, categoryFilter]);

  const detailModal = useModalState<Treatment>();
  const createModal = useModalState();

  const handleCreate = useCallback(
    (payload: Partial<Treatment>) => {
      createMutation.mutate(payload as any, {
        onSuccess: () => createModal.close(),
      });
    },
    [createMutation, createModal]
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<Treatment>) => {
      updateMutation.mutate({ id, updates } as any, {
        onSuccess: () => detailModal.close(),
      });
    },
    [updateMutation, detailModal]
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
          {error instanceof Error ? error.message : "Failed to load treatments"}
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
          <Button variation="primary" onClick={() => createModal.open()}>
            <Plus size={16} /> New Treatment
          </Button>
        </PageHeader>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginTop: 8,
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
        <Grid>
          {filtered.map((t) => (
            <Card
              key={t.id}
              onClick={() => detailModal.open(t)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") detailModal.open(t);
              }}
              style={{ cursor: "pointer" }}
            >
              <div>
                <Title>{t.name}</Title>
                {t.description && (
                  <div style={{ color: "var(--muted)", marginTop: 6 }}>
                    {t.description}
                  </div>
                )}
                <MetaRow>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <ClockIcon size={14} /> {t.durationMinutes} min
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <DollarIcon size={14} /> ${(t.price ?? 0).toFixed(2)}
                  </div>
                  {t.popularityScore && t.popularityScore > 80 && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <TrendingUp size={14} /> Popular
                    </div>
                  )}
                </MetaRow>
              </div>
            </Card>
          ))}
        </Grid>
      )}

      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        title={detailModal.selectedItem?.name ?? "Treatment"}
        size="md"
      >
        {detailModal.selectedItem ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <strong>Category:</strong>{" "}
              {detailModal.selectedItem.category ?? "—"}
            </div>
            <div>
              <strong>Duration:</strong>{" "}
              {detailModal.selectedItem.durationMinutes} min
            </div>
            <div>
              <strong>Price:</strong> $
              {(detailModal.selectedItem.price ?? 0).toFixed(2)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button
                variation="primary"
                onClick={() =>
                  detailModal.selectedItem &&
                  handleUpdate(
                    detailModal.selectedItem.id,
                    detailModal.selectedItem
                  )
                }
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
              <Button
                variation="danger"
                onClick={() =>
                  detailModal.selectedItem &&
                  handleDelete(detailModal.selectedItem.id)
                }
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div>Loading…</div>
        )}
      </Modal>

      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        title="Create treatment"
        size="md"
      >
        {/* Replace with your CreateTreatmentModal if you have one */}
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="Name"
            onChange={(e) => ((createModal as any).tempName = e.target.value)}
          />
          <input
            placeholder="Duration (minutes)"
            type="number"
            onChange={(e) =>
              ((createModal as any).tempDuration = Number(e.target.value))
            }
          />
          <input
            placeholder="Price"
            type="number"
            onChange={(e) =>
              ((createModal as any).tempPrice = Number(e.target.value))
            }
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button
              variation="primary"
              onClick={() => {
                const p = {
                  name: (createModal as any).tempName ?? "",
                  durationMinutes: (createModal as any).tempDuration ?? 60,
                  price: (createModal as any).tempPrice ?? 0,
                };
                handleCreate(p as any);
              }}
              disabled={createMutation.isPending}
            >
              Create
            </Button>
            <Button onClick={createModal.close}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
