// react hot toast is being used but I'm leaving this here
import React, { createContext, useContext, useState, useCallback } from "react";
import { ToastContainerComponent, type Toast, type ToastType } from "./Toast";

interface ToastContextValue {
  toasts: Toast[];
  showToast: (
    type: ToastType,
    message: string,
    description?: string,
    duration?: number
  ) => void;
  success: (message: string, description?: string, duration?: number) => void;
  error: (message: string, description?: string, duration?: number) => void;
  warning: (message: string, description?: string, duration?: number) => void;
  info: (message: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      type: ToastType,
      message: string,
      description?: string,
      duration: number = 5000
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = {
        id,
        type,
        message,
        description,
        duration,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Keep only the most recent toasts up to maxToasts
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts);
        }
        return updated;
      });
    },
    [maxToasts]
  );

  const success = useCallback(
    (message: string, description?: string, duration?: number) => {
      showToast("success", message, description, duration);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, description?: string, duration?: number) => {
      showToast("error", message, description, duration);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, description?: string, duration?: number) => {
      showToast("warning", message, description, duration);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, description?: string, duration?: number) => {
      showToast("info", message, description, duration);
    },
    [showToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextValue = {
    toasts,
    showToast,
    success,
    error,
    warning,
    info,
    removeToast,
    clearAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainerComponent toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}
