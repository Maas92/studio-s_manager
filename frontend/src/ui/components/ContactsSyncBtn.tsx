import { useState } from "react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/google-contacts/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("Response:", response);

      const result = await response.json();

      if (result.success) {
        setLastSync(new Date());
        alert(`Sync completed! 
          Created: ${result.result.created}
          Updated: ${result.result.updated}
          Skipped: ${result.result.skipped}`);
      }
    } catch (error: any) {
      alert("Sync failed: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="btn btn-primary"
      >
        {syncing ? "Syncing..." : "Sync Google Contacts"}
      </button>
      {lastSync && (
        <p className="text-sm text-gray-500 mt-2">
          Last synced: {lastSync.toLocaleString()}
        </p>
      )}
    </div>
  );
}
