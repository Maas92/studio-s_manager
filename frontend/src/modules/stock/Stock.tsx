import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { Plus, Archive } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import Table from "../../ui/components/Table";
import Modal from "../../ui/components/Modal";

import { useStock } from "./useStock";
import { useListFilter } from "../../hooks/useListFilter";
import { useModalState } from "../../hooks/useModalState";

import type { StockItem } from "./StockSchema";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const ActionsRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
  align-items: center;
`;

export default function StockPage() {
  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useStock();
  const stock = listQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const { filteredItems, searchQuery, setSearchQuery } =
    useListFilter<StockItem>(stock, {
      searchFields: ["sku", "name", "category"],
    });

  const detailModal = useModalState<StockItem>();
  const createModal = useModalState();

  const [form, setForm] = useState<{
    name?: string;
    sku?: string;
    quantity?: number;
    retailPrice?: number;
    category?: string;
  }>({});

  const openCreate = useCallback(() => {
    setForm({});
    createModal.open();
  }, [createModal]);

  const handleCreate = useCallback(() => {
    createMutation.mutate(
      {
        name: form.name ?? "",
        sku: form.sku ?? "",
        quantity: form.quantity ?? 0,
        retailPrice: form.retailPrice ?? 0,
        category: form.category ?? undefined,
        location: "storage",
      },
      {
        onSuccess: () => {
          createModal.close();
          toast.success("Stock item created");
        },
      }
    );
  }, [createMutation, form, createModal]);

  const handleUpdate = useCallback(
    (id: string, updates: Partial<StockItem>) => {
      updateMutation.mutate(
        { id, updates },
        {
          onSuccess: () => {
            detailModal.close();
            toast.success("Stock updated");
          },
        }
      );
    },
    [updateMutation, detailModal]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this stock item?")) return;
      deleteMutation.mutate(id, {
        onSuccess: () => {
          detailModal.close();
          toast.success("Stock removed");
        },
      });
    },
    [deleteMutation, detailModal]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Stock" />
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <PageHeader title="Stock" />
        <div style={{ padding: 12 }}>
          {(error instanceof Error && error.message) || "Failed to load stock"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div style={{ position: "sticky", top: 0, zIndex: 5, paddingBottom: 12 }}>
        <PageHeader title="Stock">
          <Button variation="primary" onClick={openCreate}>
            <Plus size={14} /> New Item
          </Button>
        </PageHeader>

        <ActionsRow>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search stock by SKU or name..."
          />
          {/* Future: add filter dropdowns or category chips here */}
        </ActionsRow>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={searchQuery ? "No stock items found" : "No stock items"}
        >
          {!searchQuery && <p>Add stock items to start tracking inventory.</p>}
        </EmptyState>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>retailPrice</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((it) => (
                <tr key={it.id}>
                  <td>{it.name ?? "—"}</td>
                  <td>{it.sku ?? "—"}</td>
                  <td>{it.category ?? "—"}</td>
                  <td>{it.quantity ?? 0}</td>
                  <td>${Number(it.retailPrice ?? 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        size="small"
                        variation="secondary"
                        onClick={() => detailModal.open(it)}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variation="danger"
                        onClick={() => handleDelete(it.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        title={detailModal.selectedItem?.name ?? "Stock item"}
        size="md"
      >
        {detailModal.selectedItem ? (
          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>SKU:</strong> {detailModal.selectedItem.sku ?? "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Quantity:</strong>{" "}
              {detailModal.selectedItem.quantity ?? 0}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>retailPrice:</strong> $
              {Number(detailModal.selectedItem.retailPrice ?? 0).toFixed(2)}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button
                onClick={() => {
                  const id = detailModal.selectedItem?.id;
                  if (!id) return;
                  // Quick +1 update example
                  handleUpdate(id, {
                    quantity: (detailModal.selectedItem?.quantity ?? 0) + 1,
                  } as Partial<StockItem>);
                }}
                variation="primary"
              >
                +1
              </Button>

              <Button
                onClick={() => {
                  const id = detailModal.selectedItem?.id;
                  if (!id) return;
                  handleUpdate(id, {
                    quantity: Math.max(
                      0,
                      (detailModal.selectedItem?.quantity ?? 1) - 1
                    ),
                  } as Partial<StockItem>);
                }}
              >
                -1
              </Button>

              <Button
                variation="danger"
                onClick={() =>
                  detailModal.selectedItem &&
                  handleDelete(detailModal.selectedItem.id)
                }
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
        title="Create stock item"
        size="md"
      >
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="Name"
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            placeholder="SKU"
            value={form.sku ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          />
          <input
            placeholder="Category"
            value={form.category ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
          />
          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity ?? 0}
            onChange={(e) =>
              setForm((f) => ({ ...f, quantity: Number(e.target.value) }))
            }
          />
          <input
            type="number"
            placeholder="retailPrice"
            value={form.retailPrice ?? 0}
            onChange={(e) =>
              setForm((f) => ({ ...f, retailPrice: Number(e.target.value) }))
            }
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button
              variation="primary"
              onClick={handleCreate}
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
