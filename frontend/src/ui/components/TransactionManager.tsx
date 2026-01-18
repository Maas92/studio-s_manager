// Admin UI for managing pending and failed transactions

import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { outboxDB } from "../../utils/outboxDB";
import { useOutbox } from "../../hooks/useOutbox";
import Button from "./Button";
import Card from "./Card";
import type { OutboxTransaction, OutboxStatus } from "../../types/outbox";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled(Card)<{
  $variant?: "pending" | "failed" | "completed";
}>`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-left: 4px solid;
  border-left-color: ${({ $variant, theme }) => {
    switch ($variant) {
      case "pending":
        return theme.color.yellow700;
      case "failed":
        return theme.color.red500;
      case "completed":
        return theme.color.green500;
      default:
        return theme.color.border;
    }
  }};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  border-bottom: 2px solid ${({ theme }) => theme.color.border};
  flex-wrap: wrap;
`;

const FilterTab = styled.button<{ $active: boolean }>`
  padding: 0.625rem 1.25rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.color.brand600 : theme.color.mutedText};
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.color.brand600 : "transparent")};
  margin-bottom: -2px;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.color.brand600};
  }
`;

const TransactionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TransactionCard = styled(Card)`
  padding: 1.25rem;
`;

const TransactionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const TransactionHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const StatusBadge = styled.div<{ $status: OutboxStatus }>`
  padding: 0.25rem 0.625rem;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background-color: ${({ $status, theme }) => {
    switch ($status) {
      case "pending":
        return theme.color.yellow100;
      case "failed":
        return theme.color.red100;
      case "completed":
        return theme.color.green100;
    }
  }};
  color: ${({ $status, theme }) => {
    switch ($status) {
      case "pending":
        return theme.color.grey900;
      case "failed":
        return theme.color.red600;
      case "completed":
        return theme.color.green700;
    }
  }};
`;

const MethodBadge = styled.div`
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.color.grey200};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Endpoint = styled.div`
  font-family: "Courier New", monospace;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.text};
`;

const TransactionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const DetailRow = styled.div<{ $isError?: boolean }>`
  display: flex;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: ${({ $isError, theme }) =>
    $isError ? theme.color.red600 : theme.color.text};
`;

const DetailLabel = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.color.mutedText};
  min-width: 80px;
`;

const DetailValue = styled.span`
  word-break: break-all;
  font-family: ${({ children }) =>
    typeof children === "string" && children.startsWith("txn_")
      ? "'Courier New', monospace"
      : "inherit"};
`;

const TransactionData = styled.details`
  margin-bottom: 0.75rem;

  summary {
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.brand600};
    padding: 0.5rem 0;

    &:hover {
      text-decoration: underline;
    }
  }

  pre {
    background: ${({ theme }) => theme.color.grey100};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radii.sm};
    padding: 0.75rem;
    overflow-x: auto;
    font-size: 0.75rem;
    margin: 0.5rem 0 0 0;
  }
`;

const TransactionActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3.75rem 1.25rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

// ============================================================================
// COMPONENT
// ============================================================================

type FilterType = "all" | "pending" | "failed" | "completed";

export const TransactionManager: React.FC = () => {
  const [transactions, setTransactions] = useState<OutboxTransaction[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const { retryFailed, deleteTransaction, clearCompleted, forceSync, stats } =
    useOutbox();

  const loadTransactions = useCallback(async () => {
    try {
      if (!outboxDB["db"]) return;

      const tx = outboxDB["db"].transaction(["transactions"], "readonly");
      const store = tx.objectStore("transactions");
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as OutboxTransaction[];

        if (filter !== "all") {
          results = results.filter((t) => t.status === filter);
        }

        // Sort by timestamp (newest first)
        results.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(results);
      };
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  }, [filter]);

  useEffect(() => {
    loadTransactions();

    // Refresh every 5 seconds
    const interval = setInterval(loadTransactions, 5000);
    return () => clearInterval(interval);
  }, [loadTransactions]);

  const handleRetry = async (id: string) => {
    await retryFailed(id);
    loadTransactions();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      await deleteTransaction(id);
      loadTransactions();
    }
  };

  const handleClearCompleted = async () => {
    if (window.confirm("Clear all completed transactions?")) {
      await clearCompleted();
      loadTransactions();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Container>
      <Header>
        <Title>Transaction Queue</Title>
        <HeaderActions>
          <Button variation="primary" size="small" onClick={() => forceSync()}>
            <RefreshCw size={14} />
            Force Sync
          </Button>
          <Button
            variation="secondary"
            size="small"
            onClick={handleClearCompleted}
          >
            Clear Completed
          </Button>
        </HeaderActions>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatLabel>Total</StatLabel>
          <StatValue>{stats.total}</StatValue>
        </StatCard>
        <StatCard $variant="pending">
          <StatLabel>Pending</StatLabel>
          <StatValue>{stats.pending}</StatValue>
        </StatCard>
        <StatCard $variant="failed">
          <StatLabel>Failed</StatLabel>
          <StatValue>{stats.failed}</StatValue>
        </StatCard>
        <StatCard $variant="completed">
          <StatLabel>Completed</StatLabel>
          <StatValue>{stats.completed}</StatValue>
        </StatCard>
      </StatsGrid>

      <FilterTabs>
        <FilterTab $active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterTab>
        <FilterTab
          $active={filter === "pending"}
          onClick={() => setFilter("pending")}
        >
          Pending
        </FilterTab>
        <FilterTab
          $active={filter === "failed"}
          onClick={() => setFilter("failed")}
        >
          Failed
        </FilterTab>
        <FilterTab
          $active={filter === "completed"}
          onClick={() => setFilter("completed")}
        >
          Completed
        </FilterTab>
      </FilterTabs>

      <TransactionList>
        {transactions.length === 0 ? (
          <EmptyState>
            No {filter !== "all" ? filter : ""} transactions
          </EmptyState>
        ) : (
          transactions.map((txn) => (
            <TransactionCard key={txn.id}>
              <TransactionHeader>
                <TransactionHeaderLeft>
                  <StatusBadge $status={txn.status}>{txn.status}</StatusBadge>
                  <MethodBadge>{txn.method}</MethodBadge>
                  <Endpoint>{txn.endpoint}</Endpoint>
                </TransactionHeaderLeft>
                <TransactionActions>
                  {txn.status === "failed" && (
                    <Button
                      variation="primary"
                      size="small"
                      onClick={() => handleRetry(txn.id)}
                    >
                      <RefreshCw size={14} />
                      Retry
                    </Button>
                  )}
                  <Button
                    variation="danger"
                    size="small"
                    onClick={() => handleDelete(txn.id)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </TransactionActions>
              </TransactionHeader>

              <TransactionDetails>
                <DetailRow>
                  <DetailLabel>ID:</DetailLabel>
                  <DetailValue>{txn.id}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Created:</DetailLabel>
                  <DetailValue>{formatDate(txn.timestamp)}</DetailValue>
                </DetailRow>
                {txn.retryCount > 0 && (
                  <DetailRow>
                    <DetailLabel>Retries:</DetailLabel>
                    <DetailValue>{txn.retryCount}</DetailValue>
                  </DetailRow>
                )}
                {txn.error && (
                  <DetailRow $isError>
                    <DetailLabel>
                      <AlertCircle
                        size={14}
                        style={{ verticalAlign: "middle" }}
                      />{" "}
                      Error:
                    </DetailLabel>
                    <DetailValue>{txn.error}</DetailValue>
                  </DetailRow>
                )}
              </TransactionDetails>

              <TransactionData>
                <summary>View Data</summary>
                <pre>{JSON.stringify(txn.data, null, 2)}</pre>
              </TransactionData>
            </TransactionCard>
          ))
        )}
      </TransactionList>
    </Container>
  );
};

export default TransactionManager;
