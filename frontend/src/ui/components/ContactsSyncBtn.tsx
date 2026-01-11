import { useState, useEffect } from "react";
import {
  checkGoogleConnection,
  connectGoogleAccount,
  syncGoogleContacts,
  disconnectGoogleAccount,
} from "../../utils/googleContacts";
import { Recycle } from "lucide-react";
import Button from "./Button";

export function SyncButton() {
  const [isConnected, setIsConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("google_connected") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      alert("✅ Google account connected successfully!");
    }
  }, []);

  const checkConnection = async () => {
    setChecking(true);
    setError(null);
    try {
      const connected = await checkGoogleConnection();
      setIsConnected(connected);
    } catch (err: any) {
      if (err.name === "CanceledError" || err.name === "AbortError") {
        setError("Connection check timed out");
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    setError(null);
    try {
      await connectGoogleAccount();
      // User will be redirected to Google
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const result = await syncGoogleContacts();

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

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Google account?")) {
      return;
    }

    setError(null);
    try {
      await disconnectGoogleAccount();
      setIsConnected(false);
      alert("✅ Google account disconnected");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  if (checking) {
    return (
      <div className="card p-4">
        <div className="animate-pulse">Checking Google connection...</div>
      </div>
    );
  }

  if (error && !isConnected) {
    return (
      <div className="card p-4">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <button onClick={checkConnection} className="btn btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="card p-4 bg-white shadow rounded-lg">
        <h3 className="text-lg font-semibold mb-2">
          🔗 Connect Google Contacts
        </h3>
        <p className="text-gray-600 mb-4">
          Connect your Google account to automatically sync your contacts with
          your client list
        </p>
        {error && <div className="text-red-600 text-sm mb-3">⚠️ {error}</div>}
        <button onClick={handleConnect} className="btn btn-primary w-full">
          🔐 Connect Google Account
        </button>
      </div>
    );
  }

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
