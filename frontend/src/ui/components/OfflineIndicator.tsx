import React, { useState, useEffect, type FC } from "react";
import { WifiOff, Wifi, RefreshCw, AlertCircle } from "lucide-react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { syncService } from "../../services/syncService";
import { type SyncEvent, type SyncStatus } from "../../types";

export const OfflineIndicator: FC = () => {
  const { isOnline, isConnected } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    // Update pending count
    const updateCount = async (): Promise<void> => {
      const count = await syncService.getPendingSyncCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    // Listen to sync events
    const unsubscribe = syncService.subscribe((event: SyncEvent) => {
      if (event.type === "sync_start") {
        setSyncing(true);
        setSyncStatus("Syncing...");
      } else if (event.type === "sync_complete") {
        setSyncing(false);
        setSyncStatus(`Synced ${event.synced} items`);
        updateCount();
        setTimeout(() => setSyncStatus(null), 3000);
      } else if (event.type === "sync_error") {
        setSyncing(false);
        setSyncStatus(`Error: ${event.error}`);
        setTimeout(() => setSyncStatus(null), 5000);
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async (): Promise<void> => {
    if (!isConnected || syncing) return;

    try {
      await syncService.triggerSync();
    } catch (err) {
      console.error("Manual sync failed:", err);
    }
  };

  if (!isOnline || !isConnected) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff size={20} />
            <span className="font-medium">
              Working Offline - Changes will sync when connection returns
            </span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{pendingCount} pending</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white px-4 py-2 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span className="font-medium">
              {pendingCount} transaction{pendingCount !== 1 ? "s" : ""} pending
              sync
            </span>
            {syncStatus && <span className="text-sm ml-2">• {syncStatus}</span>}
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-white text-blue-600 px-4 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Sync Status Badge Component
interface SyncStatusBadgeProps {
  status: SyncStatus;
}

export const SyncStatusBadge: FC<SyncStatusBadgeProps> = ({ status }) => {
  if (status === "synced") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
        <Wifi size={12} />
        Synced
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
        <RefreshCw size={12} />
        Pending
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
        <AlertCircle size={12} />
        Failed
      </span>
    );
  }

  return null;
};
