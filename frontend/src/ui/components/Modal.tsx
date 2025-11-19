// ui/components/Modal.tsx
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  closeOnBackdrop?: boolean;
  className?: string;
  size?: ModalSize;
  ariaLabel?: string;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.6rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  box-sizing: border-box;
`;

const Content = styled.div<{ size: ModalSize }>`
  position: relative;
  width: 100%;
  max-width: ${(p) =>
    p.size === "sm" ? "520px" : p.size === "lg" ? "1100px" : "760px"};
  max-width: clamp(
    320px,
    90vw,
    ${(p) => (p.size === "sm" ? "520px" : p.size === "lg" ? "1100px" : "760px")}
  );
  box-sizing: border-box;
  background: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadowLg};
  padding: 1.6rem;
  outline: none;
  border: 1px solid ${({ theme }) => theme.color.border};
  max-height: 90vh;
  overflow: auto;
  flex: 0 0 auto;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 2.125rem;
  font-weight: 700;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 6px;
  color: ${({ theme }) => theme.color.mutedText};

  &:hover {
    color: ${({ theme }) => theme.color.text};
    background: rgba(0, 0, 0, 0.04);
    border-radius: 6px;
  }
`;

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdrop = true,
  className = "",
  size = "md",
  ariaLabel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Always call hooks (SSR-safe)
  const isBrowser = typeof window !== "undefined";

  useEffect(() => {
    if (!isBrowser || !isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimeout = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;

      const selector =
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(selector)
      );

      if (focusable.length > 0) focusable[0].focus();
      else root.focus();
    }, 0);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;

        const selector =
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

        const focusable = Array.from(
          root.querySelectorAll<HTMLElement>(selector)
        );

        if (focusable.length === 0) {
          e.preventDefault();
          root.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isBrowser, isOpen, onClose]);

  if (!isBrowser || !isOpen) return null;

  const modal = (
    <Overlay
      role="presentation"
      onMouseDown={() => {
        if (closeOnBackdrop) onClose();
      }}
    >
      <Content
        role="dialog"
        aria-modal="true"
        aria-label={
          ariaLabel ?? (typeof title === "string" ? title : "Modal dialog")
        }
        size={size}
        className={className}
        ref={dialogRef}
        tabIndex={-1}
        onMouseDown={(e) => {
          // Stops the backdrop from closing when clicking inside
          e.stopPropagation();
        }}
      >
        {title ? (
          <Header>
            <Title>{title}</Title>
            <CloseButton aria-label="Close modal" onClick={onClose}>
              ✕
            </CloseButton>
          </Header>
        ) : (
          <CloseButton
            style={{ position: "absolute", right: 12, top: 12 }}
            aria-label="Close modal"
            onClick={onClose}
          >
            ✕
          </CloseButton>
        )}

        <div>{children}</div>
      </Content>
    </Overlay>
  );

  return ReactDOM.createPortal(modal, document.body);
}
