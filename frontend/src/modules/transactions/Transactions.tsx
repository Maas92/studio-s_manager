import React, { useState } from "react";
import styled from "styled-components";
import {
  FileText,
  CreditCard,
  Banknote,
  SplitSquareHorizontal,
  ChevronDown,
  ChevronUp,
  User,
  ShoppingBag,
} from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import SearchBar from "../../ui/components/SearchBar";
import FilterBar from "../../ui/components/FilterBar";
import EmptyState from "../../ui/components/EmptyState";
import Badge from "../../ui/components/Badge";
import Table from "../../ui/components/Table";
import Modal from "../../ui/components/Modal";

import { useTransactions } from "./useTransactions";
import { useListFilter } from "../../hooks/useListFilter";
import { useModalState } from "../../hooks/useModalState";

import type { Transaction } from "./TransactionSchema";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 1rem;
  margin-bottom: 1rem;
`;

const DateInput = styled.input`
  padding: 0.6rem 1rem;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  font-family: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.color.brand600};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
  }
`;

const SummaryBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const SummaryChip = styled.div`
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};

  strong {
    color: ${({ theme }) => theme.color.brand600};
  }
`;

const MutedText = styled.span`
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.875rem;
`;

const ClickableTr = styled.tr`
  cursor: pointer;
  transition: background 0.1s;

  &:hover td {
    background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  }
`;

const ExpandToggleTd = styled.td`
  color: ${({ theme }) => theme.color.mutedText};
  text-align: center;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ExpandedTr = styled.tr`
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};

  td {
    border-top: 1px dashed ${({ theme }) => theme.color.border} !important;
    padding: 1rem 1.25rem 1.25rem !important;
  }
`;

const ItemsGrid = styled.div`
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const ItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  font-size: 0.875rem;
`;

const ItemName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.color.text};
`;

const ItemMeta = styled.div`
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.8rem;
`;

const ItemPrice = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;

const ExpandedSummary = styled.div`
  display: flex;
  gap: 1.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  flex-wrap: wrap;
`;

const SummaryItem = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};

  strong {
    color: ${({ theme }) => theme.color.text};
  }
`;

const ClientCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;

  svg {
    width: 13px;
    height: 13px;
    color: ${({ theme }) => theme.color.mutedText};
    flex-shrink: 0;
  }
`;

const ItemSummaryCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
    opacity: 0.4;
  }
`;

const PaymentMethodCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.color.mutedText};
  }
`;

const DetailRow = styled.div`
  margin-bottom: 8px;
`;

// ============================================================================
// HELPERS
// ============================================================================

function getPaymentIcon(method: string) {
  switch (method?.toLowerCase()) {
    case "card":
      return <CreditCard />;
    case "cash":
      return <Banknote />;
    case "split":
      return <SplitSquareHorizontal />;
    default:
      return <CreditCard />;
  }
}

function getStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "default" {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "default";
  }
}

function getPrimaryPaymentMethod(payments: any[]): string {
  if (!payments?.length) return "unknown";
  return [...payments].sort((a, b) => b.amount - a.amount)[0].method;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const METHOD_FILTERS = [
  { value: "", label: "All Methods" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "split", label: "Split" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { listQuery } = useTransactions();
  const transactions = listQuery.data ?? [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  // Your existing hook for search filtering
  const {
    filteredItems: searchFiltered,
    searchQuery,
    setSearchQuery,
  } = useListFilter<Transaction>(transactions, {
    searchFields: ["reference", "clientName", "paymentMethod"],
  });

  // Additional filters on top of search
  const filteredItems = searchFiltered.filter((tx) => {
    if (statusFilter && tx.status !== statusFilter) return false;
    if (methodFilter) {
      const primary = getPrimaryPaymentMethod(tx.payments ?? []);
      if (primary !== methodFilter) return false;
    }
    if (
      dateFrom &&
      new Date(tx.createdAt ?? tx.datetimeISO ?? 0) < new Date(dateFrom)
    )
      return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59);
      if (new Date(tx.createdAt ?? tx.datetimeISO ?? 0) > end) return false;
    }
    return true;
  });

  const summary = {
    count: filteredItems.length,
    completed: filteredItems.filter((tx) => tx.status === "completed").length,
    total: filteredItems.reduce(
      (sum, tx) => sum + Number(tx.total ?? tx.amount ?? 0),
      0,
    ),
  };

  // Your existing modal hook
  const detailModal = useModalState<Transaction>();

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Transactions" />
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <PageHeader title="Transactions" />
        <div style={{ padding: 12 }}>
          {(error instanceof Error && error.message) ||
            "Failed to load transactions"}
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
          zIndex: 5,
          paddingBottom: 12,
          background: "inherit",
        }}
      >
        <PageHeader title="Transactions" />

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by reference, client, or method..."
        />

        <FiltersRow>
          <FilterBar
            filters={STATUS_FILTERS}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />
          <FilterBar
            filters={METHOD_FILTERS}
            activeFilter={methodFilter}
            onFilterChange={setMethodFilter}
          />
          <DateInput
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
          />
          <DateInput
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
          />
        </FiltersRow>

        <SummaryBar>
          <SummaryChip>
            <strong>{summary.count}</strong> transactions
          </SummaryChip>
          <SummaryChip>
            <strong>{summary.completed}</strong> completed
          </SummaryChip>
          <SummaryChip>
            Total: <strong>${summary.total.toFixed(2)}</strong>
          </SummaryChip>
        </SummaryBar>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? "No transactions found" : "No transactions yet"}
        >
          {!searchQuery && (
            <p>Make a sale or record a transaction to populate this list.</p>
          )}
        </EmptyState>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((tx) => {
                const isExpanded = expandedId === tx.id;
                const primaryMethod = getPrimaryPaymentMethod(
                  tx.payments ?? [],
                );
                const itemSummary = tx.items?.length
                  ? tx.items.length === 1
                    ? tx.items[0].name
                    : `${tx.items[0].name} +${tx.items.length - 1} more`
                  : (tx.reference ?? "—");

                return (
                  <React.Fragment key={tx.id}>
                    <ClickableTr
                      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                    >
                      <td>
                        <div>
                          {new Date(
                            tx.createdAt ?? tx.datetimeISO ?? Date.now(),
                          ).toLocaleDateString("en-ZA")}
                        </div>
                        <MutedText>
                          {new Date(
                            tx.createdAt ?? tx.datetimeISO ?? Date.now(),
                          ).toLocaleTimeString("en-ZA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </MutedText>
                      </td>
                      <td>
                        <ClientCell>
                          <User />
                          {tx.clientName ?? <MutedText>Walk-in</MutedText>}
                        </ClientCell>
                      </td>
                      <td>
                        <ItemSummaryCell
                          title={tx.items?.map((i: any) => i.name).join(", ")}
                        >
                          <ShoppingBag size={13} />
                          {itemSummary}
                        </ItemSummaryCell>
                      </td>
                      <td>
                        <strong>
                          ${Number(tx.total ?? tx.amount ?? 0).toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <PaymentMethodCell>
                          {getPaymentIcon(primaryMethod)}
                          {primaryMethod.charAt(0).toUpperCase() +
                            primaryMethod.slice(1)}
                        </PaymentMethodCell>
                      </td>
                      <td>
                        <Badge variant={getStatusVariant(tx.status)}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          size="small"
                          variation="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            detailModal.open(tx);
                          }}
                        >
                          View
                        </Button>
                      </td>
                      <ExpandToggleTd>
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </ExpandToggleTd>
                    </ClickableTr>

                    {isExpanded && (
                      <ExpandedTr>
                        <td colSpan={8}>
                          {tx.items?.length > 0 && (
                            <ItemsGrid>
                              {tx.items.map((item: any, idx: number) => (
                                <ItemRow key={idx}>
                                  <div>
                                    <ItemName>{item.name}</ItemName>
                                    <ItemMeta>
                                      {item.type} · qty {item.quantity}
                                    </ItemMeta>
                                  </div>
                                  <ItemPrice>
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </ItemPrice>
                                </ItemRow>
                              ))}
                            </ItemsGrid>
                          )}
                          <ExpandedSummary>
                            {tx.subtotal !== undefined && (
                              <SummaryItem>
                                Subtotal:{" "}
                                <strong>
                                  ${Number(tx.subtotal).toFixed(2)}
                                </strong>
                              </SummaryItem>
                            )}
                            {tx.discountAmount > 0 && (
                              <SummaryItem>
                                Discount:{" "}
                                <strong>
                                  -${Number(tx.discountAmount).toFixed(2)}
                                </strong>
                              </SummaryItem>
                            )}
                            {tx.tipsTotal > 0 && (
                              <SummaryItem>
                                Tips:{" "}
                                <strong>
                                  ${Number(tx.tipsTotal).toFixed(2)}
                                </strong>
                              </SummaryItem>
                            )}
                            {tx.payments?.length > 1 && (
                              <SummaryItem>
                                Split:{" "}
                                <strong>
                                  {tx.payments
                                    .map(
                                      (p: any) =>
                                        `${p.method} $${p.amount.toFixed(2)}`,
                                    )
                                    .join(" + ")}
                                </strong>
                              </SummaryItem>
                            )}
                            <SummaryItem>
                              ID:{" "}
                              <strong
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {tx.id}
                              </strong>
                            </SummaryItem>
                          </ExpandedSummary>
                        </td>
                      </ExpandedTr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Your existing detail modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        title="Transaction Details"
        size="md"
      >
        {detailModal.selectedItem ? (
          <div>
            <DetailRow>
              <strong>Reference:</strong>{" "}
              {detailModal.selectedItem.reference ?? "—"}
            </DetailRow>
            <DetailRow>
              <strong>Client:</strong>{" "}
              {detailModal.selectedItem.clientName ?? "Walk-in"}
            </DetailRow>
            <DetailRow>
              <strong>Amount:</strong> $
              {Number(
                detailModal.selectedItem.total ??
                  detailModal.selectedItem.amount ??
                  0,
              ).toFixed(2)}
            </DetailRow>
            <DetailRow>
              <strong>Method:</strong>{" "}
              {detailModal.selectedItem.paymentMethod ??
                getPrimaryPaymentMethod(
                  detailModal.selectedItem.payments ?? [],
                )}
            </DetailRow>
            <DetailRow>
              <strong>Status:</strong>{" "}
              <Badge
                variant={getStatusVariant(detailModal.selectedItem.status)}
              >
                {detailModal.selectedItem.status}
              </Badge>
            </DetailRow>
            <DetailRow>
              <strong>Date:</strong>{" "}
              {new Date(
                detailModal.selectedItem.createdAt ??
                  detailModal.selectedItem.datetimeISO ??
                  Date.now(),
              ).toLocaleString()}
            </DetailRow>

            {detailModal.selectedItem.items?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>Items:</strong>
                <ItemsGrid style={{ marginTop: 8 }}>
                  {detailModal.selectedItem.items.map(
                    (item: any, idx: number) => (
                      <ItemRow key={idx}>
                        <div>
                          <ItemName>{item.name}</ItemName>
                          <ItemMeta>
                            {item.type} · qty {item.quantity}
                          </ItemMeta>
                        </div>
                        <ItemPrice>
                          ${(item.price * item.quantity).toFixed(2)}
                        </ItemPrice>
                      </ItemRow>
                    ),
                  )}
                </ItemsGrid>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    JSON.stringify(detailModal.selectedItem, null, 2),
                  );
                  toast.success("Copied");
                }}
              >
                Copy JSON
              </Button>
            </div>
          </div>
        ) : (
          <div>Loading…</div>
        )}
      </Modal>
    </PageWrapper>
  );
}
