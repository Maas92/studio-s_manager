// src/ui/components/EmptyState.tsx
import React from "react";
import styled from "styled-components";
import type { LucideProps } from "lucide-react";

export type EmptyStateProps = {
  /** Optional icon component (lucide icon component) */
  icon?: React.ComponentType<LucideProps>;
  /** Main title (large) */
  title?: string;
  /** Optional description text */
  description?: string;
  /** Optional short action button text */
  actionText?: string;
  /** Optional action callback for the button */
  onAction?: () => void;
  /** Allow arbitrary children (custom content) */
  children?: React.ReactNode;
  /** Optional small variant */
  size?: "sm" | "md" | "lg";
  /** className for styled-components / overrides */
  className?: string;
};

const Wrapper = styled.div<{ $size: EmptyStateProps["size"] }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${({ $size }) =>
    $size === "sm" ? "1rem" : $size === "lg" ? "3rem" : "2rem"};
  color: ${({ theme }) => theme.color.mutedText};
  gap: 0.75rem;
`;

const IconWrapper = styled.div<{ $size: EmptyStateProps["size"] }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) =>
    $size === "sm" ? "36px" : $size === "lg" ? "72px" : "48px"};
  height: ${({ $size }) =>
    $size === "sm" ? "36px" : $size === "lg" ? "72px" : "48px"};
  opacity: 0.9;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  color: ${({ theme }) => theme.color.text};
`;

const Description = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.mutedText};
  max-width: 48ch;
`;

const ActionButton = styled.button`
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;
  font-weight: 600;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand600};
    background: ${({ theme }) => theme.color.brand50};
  }
`;

/**
 * EmptyState - small reusable placeholder for empty lists
 */
export default function EmptyState({
  icon: Icon,
  title = "Nothing here",
  description,
  actionText,
  onAction,
  children,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <Wrapper className={className} $size={size}>
      {Icon && (
        <IconWrapper $size={size}>
          {/* pass through common lucide props (size will be controlled by wrapper) */}
          <Icon size={size === "sm" ? 24 : size === "lg" ? 56 : 36} />
        </IconWrapper>
      )}

      {title && <Title>{title}</Title>}

      {/* allow consumers to either pass children (custom markup) or description prop */}
      {children ? (
        <div>{children}</div>
      ) : description ? (
        <Description>{description}</Description>
      ) : null}

      {actionText && (
        <ActionButton onClick={onAction} type="button" aria-label={actionText}>
          {actionText}
        </ActionButton>
      )}
    </Wrapper>
  );
}
