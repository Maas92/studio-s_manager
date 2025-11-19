// react hot toast is being used but I'm leaving this here
import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import styled, { keyframes } from "styled-components";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 420px;
  pointer-events: none;

  @media (max-width: 640px) {
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
`;

const ToastItem = styled.div<{ $type: ToastType; $closing?: boolean }>`
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadowLg};
  border-left: 4px solid
    ${({ $type, theme }) => {
      switch ($type) {
        case "success":
          return theme.color.green500 || "#16a34a";
        case "error":
          return theme.color.red600 || "#dc2626";
        case "warning":
          return theme.color.yellow100 || "#ca8a04";
        case "info":
          return theme.color.blue500 || "#2563eb";
        default:
          return theme.color.grey600 || "#4b5563";
      }
    }};
  animation: ${({ $closing }) => ($closing ? slideOut : slideIn)} 0.3s ease;
  pointer-events: auto;
`;

const IconWrapper = styled.div<{ $type: ToastType }>`
  flex-shrink: 0;
  color: ${({ $type, theme }) => {
    switch ($type) {
      case "success":
        return theme.color.green500 || "#16a34a";
      case "error":
        return theme.color.red600 || "#dc2626";
      case "warning":
        return theme.color.yellow700 || "#ca8a04";
      case "info":
        return theme.color.blue500 || "#2563eb";
      default:
        return theme.color.grey600 || "#4b5563";
    }
  }};
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Message = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};
  line-height: 1.4;
`;

const Description = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  line-height: 1.4;
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: ${({ theme }) => theme.color.mutedText};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.grey100 || "#f3f4f6"};
    color: ${({ theme }) => theme.color.text};
  }
`;

const ProgressBar = styled.div<{ $duration: number; $type: ToastType }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: ${({ $type, theme }) => {
    switch ($type) {
      case "success":
        return theme.color.green500 || "#16a34a";
      case "error":
        return theme.color.red600 || "#dc2626";
      case "warning":
        return theme.color.yellow100 || "#ca8a04";
      case "info":
        return theme.color.blue500 || "#2563eb";
      default:
        return theme.color.grey600 || "#4b5563";
    }
  }};
  animation: shrink ${({ $duration }) => $duration}ms linear;

  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;

function getIcon(type: ToastType) {
  const size = 20;
  switch (type) {
    case "success":
      return <CheckCircle size={size} />;
    case "error":
      return <XCircle size={size} />;
    case "warning":
      return <AlertCircle size={size} />;
    case "info":
      return <Info size={size} />;
    default:
      return <Info size={size} />;
  }
}

function ToastItemComponent({ toast, onClose }: ToastItemProps) {
  const [closing, setClosing] = React.useState(false);
  const duration = toast.duration || 5000;

  useEffect(() => {
    if (duration === Infinity) return;

    const timer = setTimeout(() => {
      setClosing(true);
      setTimeout(() => onClose(toast.id), 300); // Match animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, onClose]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  return (
    <ToastItem $type={toast.type} $closing={closing}>
      <IconWrapper $type={toast.type}>{getIcon(toast.type)}</IconWrapper>
      <Content>
        <Message>{toast.message}</Message>
        {toast.description && <Description>{toast.description}</Description>}
      </Content>
      <CloseButton onClick={handleClose} aria-label="Close notification">
        <X size={16} />
      </CloseButton>
      {duration !== Infinity && (
        <ProgressBar $duration={duration} $type={toast.type} />
      )}
    </ToastItem>
  );
}

interface ToastContainerComponentProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainerComponent({
  toasts,
  onClose,
}: ToastContainerComponentProps) {
  if (typeof window === "undefined") return null;

  if (toasts.length === 0) return null;

  return ReactDOM.createPortal(
    <ToastContainer>
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </ToastContainer>,
    document.body
  );
}
