// Banner to show offline status and pending transactions

import React from "react";
import styled from "styled-components";
import { WifiOff, AlertCircle, Clock, CheckCircle } from "lucide-react";
import Button from "./Button";
import { useOutbox } from "../../hooks/useOutbox";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Banner = styled.div<{ $variant: "offline" | "pending" | "success" }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1rem;
  animation: slideDown 0.3s ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  ${({ $variant, theme }) => {
    switch ($variant) {
      case "offline":
        return `
          background-color: ${theme.color.red100};
          border: 1px solid ${theme.color.red500};
          color: ${theme.color.red600};
        `;
      case "pending":
        return `
          background-color: ${theme.color.yellow100};
          border: 1px solid ${theme.color.yellow700};
          color: ${theme.color.grey900};
        `;
      case "success":
        return `
          background-color: ${theme.color.green100};
          border: 1px solid ${theme.color.green500};
          color: ${theme.color.green700};
        `;
    }
  }}
`;

const BannerIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const BannerContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const BannerTitle = styled.div`
  font-weight: 700;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
`;

const BannerMessage = styled.div`
  font-size: 0.875rem;
  opacity: 0.9;
`;

const BannerActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

// ============================================================================
// COMPONENT
// ============================================================================

interface OfflineWarningBannerProps {
  /** Show in compact mode (smaller, less prominent) */
  compact?: boolean;
  /** Show sync button */
  showSyncButton?: boolean;
}

export const OfflineWarningBanner: React.FC<OfflineWarningBannerProps> = ({
  compact = false,
  showSyncButton = true,
}) => {
  const { isOnline, isSyncing, stats, forceSync } = useOutbox();

  // Don't show if online and no pending transactions
  if (isOnline && stats.pending === 0 && stats.failed === 0) {
    return null;
  }

  // Offline state
  if (!isOnline) {
    return (
      <Banner $variant="offline">
        <BannerIcon>
          <WifiOff size={20} />
        </BannerIcon>
        <BannerContent>
          <BannerTitle>You are offline</BannerTitle>
          {!compact && (
            <BannerMessage>
              Transactions will be queued and synced automatically when
              connection is restored.
            </BannerMessage>
          )}
        </BannerContent>
        {stats.pending > 0 && (
          <BannerActions>
            <div
              style={{
                padding: "0.375rem 0.75rem",
                background: "rgba(0, 0, 0, 0.1)",
                borderRadius: "999px",
                fontWeight: 700,
                fontSize: "0.8125rem",
              }}
            >
              {stats.pending} queued
            </div>
          </BannerActions>
        )}
      </Banner>
    );
  }

  // Pending transactions state
  if (stats.pending > 0 || stats.failed > 0) {
    return (
      <Banner $variant="pending">
        <BannerIcon>
          <Clock size={20} />
        </BannerIcon>
        <BannerContent>
          <BannerTitle>
            {stats.pending} transaction{stats.pending !== 1 ? "s" : ""} pending
            sync
          </BannerTitle>
          {!compact && (
            <BannerMessage>
              {isSyncing
                ? "Syncing now..."
                : `${stats.failed > 0 ? `${stats.failed} failed, ` : ""}Will sync automatically`}
            </BannerMessage>
          )}
        </BannerContent>
        {showSyncButton && (
          <BannerActions>
            <Button
              variation="secondary"
              size="small"
              onClick={() => forceSync()}
              disabled={isSyncing}
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </BannerActions>
        )}
      </Banner>
    );
  }

  return null;
};

export default OfflineWarningBanner;
