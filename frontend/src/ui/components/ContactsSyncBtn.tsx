import { useState } from "react";
import { Recycle } from "lucide-react";
import Button from "./Button";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Not logged in");
      }

      const response = await fetch(
        "http://localhost:4000/google-contacts/sync",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      setLastSync(new Date());
      console.log("Sync result:", result);

      // Show success message
      alert(`✅ Sync completed!\n
        Created: ${result.result.created}
        Updated: ${result.result.updated}
        Skipped: ${result.result.skipped}
        Duration: ${(result.result.duration / 1000000000).toFixed(2)}s`);
    } catch (err: any) {
      console.error("Sync error:", err);
      setError(err.message);
      alert(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Button
        variation="primary"
        onClick={() => handleSync()}
        disabled={syncing}
      >
        <Recycle size={16} /> {syncing ? "Syncing..." : "Sync Google Contacts"}
      </Button>
      {lastSync && (
        <p className="text-sm text-gray-500 mt-2">
          Last synced: {lastSync.toLocaleString()}
        </p>
      )}

      {error && <p className="text-sm text-red-500 mt-2">Error: {error}</p>}
    </>
  );
}
