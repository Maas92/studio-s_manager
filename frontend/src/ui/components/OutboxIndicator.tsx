// Visual indicator for network status and pending transactions

import React from "react";
import styled from "styled-components";
import { useOutbox } from "../../hooks/useOutbox";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
`;

const StatusBadge = styled.div<{
  $variant: "online" | "offline" | "syncing" | "pending" | "failed";
}>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${({ theme }) => theme.radii.round};
  font-weight: 600;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  border: 1px solid;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case "online":
        return `
          background-color: ${theme.color.green100};
          color: ${theme.color.green700};
          border-color: ${theme.color.green500};
        `;
      case "offline":
        return `
          background-color: ${theme.color.red100};
          color: ${theme.color.red600};
          border-color: ${theme.color.red500};
        `;
      case "syncing":
        return `
          background-color: ${theme.color.brand100};
          color: ${theme.color.brand700};
          border-color: ${theme.color.brand500};
        `;
      case "pending":
        return `
          background-color: ${theme.color.yellow100};
          color: ${theme.color.grey900};
          border-color: ${theme.color.yellow700};
        `;
      case "failed":
        return `
          background-color: ${theme.color.red100};
          color: ${theme.color.red600};
          border-color: ${theme.color.red500};
        `;
    }
  }}
`;

const StatusDot = styled.span<{ $variant: "online" | "offline" }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  background-color: ${({ $variant, theme }) =>
    $variant === "online" ? theme.color.green500 : theme.color.red500};
  animation: ${({ $variant }) =>
    $variant === "online" ? "pulse 2s ease-in-out infinite" : "none"};

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const Count = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 9px;
  font-size: 0.6875rem;
  font-weight: 700;
`;

const Spinner = styled.span`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

export const OutboxIndicator: React.FC = () => {
  const { isOnline, isSyncing, stats } = useOutbox();

  const hasPending = stats.pending > 0;
  const hasFailed = stats.failed > 0;

  return (
    <Container>
      {/* Network Status */}
      <StatusBadge $variant={isOnline ? "online" : "offline"}>
        <StatusDot $variant={isOnline ? "online" : "offline"} />
        {isOnline ? "Online" : "Offline"}
      </StatusBadge>

      {/* Sync Status */}
      {isSyncing && (
        <StatusBadge $variant="syncing">
          <Spinner />
          Syncing...
        </StatusBadge>
      )}

      {/* Pending Transactions */}
      {hasPending && (
        <StatusBadge $variant="pending">
          <Count>{stats.pending}</Count>
          Pending
        </StatusBadge>
      )}

      {/* Failed Transactions */}
      {hasFailed && (
        <StatusBadge $variant="failed">
          <Count>{stats.failed}</Count>
          Failed
        </StatusBadge>
      )}
    </Container>
  );
};

export default OutboxIndicator;
