import React, { useCallback, useState, useMemo } from "react";
import styled from "styled-components";
import {
  Plus,
  Archive,
  Package,
  AlertTriangle,
  ArrowRightLeft,
  TrendingDown,
} from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import EmptyState from "../../ui/components/EmptyState";
import Table from "../../ui/components/Table";

import { useStock } from "./useStock";
import { useListFilter } from "../../hooks/useListFilter";
import { useModalState } from "../../hooks/useModalState";
import CreateStockModal from "./CreateStockModal";
import StockDetailModal from "./StockDetailModal";
import TransferStockModal from "./TransferStockModal";
import useAuth from "../../hooks/useAuth";

import type { StockItem } from "./StockSchema";

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
`;

const LocationFilters = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const StyledTable = styled(Table)`
  min-width: 800px;
`;

const LocationBadge = styled.span<{ $location: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $location, theme }) => {
    switch ($location) {
      case "retail":
        return theme.color.blue100;
      case "treatment":
        return theme.color.green100;
      case "storage":
        return theme.color.yellow100;
      default:
        return theme.color.grey100;
    }
  }};
  color: ${({ $location, theme }) => {
    switch ($location) {
      case "retail":
        return theme.color.blue500;
      case "treatment":
        return theme.color.green700;
      case "storage":
        return theme.color.yellow700;
      default:
        return theme.color.grey700;
    }
  }};
`;

const StockLevel = styled.div<{ $level: "low" | "medium" | "high" }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 500;
  color: ${({ $level, theme }) => {
    switch ($level) {
      case "low":
        return theme.color.red600;
      case "medium":
        return theme.color.yellow700;
      case "high":
        return theme.color.green500;
    }
  }};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

function getStockLevel(
  quantity: number,
  minQuantity?: number
): "low" | "medium" | "high" {
  if (!minQuantity) return "high";
  if (quantity <= minQuantity) return "low";
  if (quantity <= minQuantity * 2) return "medium";
  return "high";
}

export default function StockPage() {
  const { canManageStock } = useAuth();

  const {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    transferMutation,
  } = useStock();
  const stock = listQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const { filteredItems } = useListFilter<StockItem>(stock, {
    searchFields: ["sku", "name", "category"],
    // searchQuery, Claud keeps on putting this back in. Removing it to use the state variable directly.
  });

  const filtered = useMemo(() => {
    if (locationFilter === "all") return filteredItems;
    return filteredItems.filter((item) => item.location === locationFilter);
  }, [filteredItems, locationFilter]);

  const lowStockItems = useMemo(() => {
    return filtered.filter(
      (item) => item.minQuantity && item.quantity <= item.minQuantity
    ).length;
  }, [filtered]);

  const detailModal = useModalState<StockItem>();
  const createModal = useModalState();
  const transferModal = useModalState<StockItem>();

  const handleCreate = useCallback(
    (payload: any) => {
      createMutation.mutate(payload, {
        onSuccess: () => {
          createModal.close();
          toast.success("Stock item created successfully!");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to create stock item");
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
            toast.success("Stock item updated successfully!");
          },
          onError: (error: any) => {
            toast.error(error?.message ?? "Failed to update stock item");
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
          toast.success("Stock item deleted successfully!");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to delete stock item");
        },
      });
    },
    [deleteMutation, detailModal]
  );

  const handleTransfer = useCallback(
    (transferData: any) => {
      transferMutation.mutate(transferData, {
        onSuccess: () => {
          transferModal.close();
          toast.success("Stock transferred successfully!");
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Failed to transfer stock");
        },
      });
    },
    [transferMutation, transferModal]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Stock Inventory" />
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
        <PageHeader title="Stock Inventory" />
        <div style={{ padding: "1rem", color: "var(--color-red500)" }}>
          {(error instanceof Error && error.message) || "Failed to load stock"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ControlsWrapper>
        <PageHeader title="Stock Inventory">
          {canManageStock && (
            <Button variation="primary" onClick={() => createModal.open()}>
              <Plus size={16} /> Add Stock Item
            </Button>
          )}
        </PageHeader>

        <FiltersRow>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by SKU, name, or category..."
          />
          <LocationFilters>
            {["all", "storage", "retail", "treatment"].map((loc) => (
              <Button
                key={loc}
                size="small"
                variation={locationFilter === loc ? "primary" : "secondary"}
                onClick={() => setLocationFilter(loc)}
              >
                {loc}
              </Button>
            ))}
          </LocationFilters>
        </FiltersRow>

        {lowStockItems > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              marginTop: "0.75rem",
              color: "#991b1b",
            }}
          >
            <AlertTriangle size={18} />
            <strong>{lowStockItems} items</strong> are running low on stock
          </div>
        )}
      </ControlsWrapper>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={
            searchQuery || locationFilter !== "all"
              ? "No stock items found"
              : "No stock items"
          }
        >
          {!searchQuery && locationFilter === "all" && canManageStock && (
            <p>Add your first stock item to start tracking inventory.</p>
          )}
        </EmptyState>
      ) : (
        <TableWrapper>
          <StyledTable>
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Location</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const stockLevel = getStockLevel(
                  item.quantity,
                  item.minQuantity
                );
                return (
                  <tr key={item.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Package size={16} />
                        <strong>{item.name}</strong>
                      </div>
                    </td>
                    <td>{item.sku || "—"}</td>
                    <td>{item.category || "—"}</td>
                    <td>
                      <LocationBadge $location={item.location}>
                        {item.location}
                      </LocationBadge>
                    </td>
                    <td>
                      <StockLevel $level={stockLevel}>
                        {stockLevel === "low" && <TrendingDown size={14} />}
                        {item.quantity} {item.unit || "units"}
                        {item.minQuantity && (
                          <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                            (min: {item.minQuantity})
                          </span>
                        )}
                      </StockLevel>
                    </td>
                    <td>{item.retailPrice ? `$${item.retailPrice}` : "—"}</td>
                    <td>
                      <Actions>
                        <Button
                          size="small"
                          variation="secondary"
                          onClick={() => detailModal.open(item)}
                        >
                          View
                        </Button>
                        {canManageStock && (
                          <Button
                            size="small"
                            variation="primary"
                            onClick={() => transferModal.open(item)}
                          >
                            <ArrowRightLeft size={14} />
                            Transfer
                          </Button>
                        )}
                      </Actions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </StyledTable>
        </TableWrapper>
      )}

      <StockDetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        item={detailModal.selectedItem}
        onTransfer={(item) => {
          detailModal.close();
          transferModal.open(item);
        }}
      />

      <TransferStockModal
        isOpen={transferModal.isOpen}
        onClose={transferModal.close}
        onTransfer={handleTransfer}
        transferring={transferMutation.isPending}
        preselectedItem={transferModal.selectedItem}
        stockItems={stock}
      />

      {canManageStock && (
        <CreateStockModal
          isOpen={createModal.isOpen}
          onClose={createModal.close}
          onCreate={handleCreate}
          creating={createMutation.isPending}
        />
      )}
    </PageWrapper>
  );
}
