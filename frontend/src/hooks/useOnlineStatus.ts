import { useState, useEffect, useCallback } from "react";
import { type OnlineStatus } from "../types/index.js";

const CONNECTIVITY_CHECK_URL = "/api/health";
const CONNECTIVITY_CHECK_INTERVAL = 30000; // 30 seconds

export const useOnlineStatus = (): OnlineStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  /**
   * Check actual connectivity by pinging backend
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsConnected(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(CONNECTIVITY_CHECK_URL, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-cache",
      });

      clearTimeout(timeoutId);
      const connected = response.ok;
      setIsConnected(connected);
      return connected;
    } catch (error) {
      const err = error as Error;
      console.log("Connectivity check failed:", err.message);
      setIsConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    // Handle online/offline events
    const handleOnline = (): void => {
      setIsOnline(true);
      checkConnectivity();
    };

    const handleOffline = (): void => {
      setIsOnline(false);
      setIsConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    checkConnectivity();

    // Periodic connectivity checks
    const intervalId = setInterval(
      checkConnectivity,
      CONNECTIVITY_CHECK_INTERVAL
    );

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [checkConnectivity]);

  return {
    isOnline,
    isConnected,
    checkConnectivity,
  };
};
