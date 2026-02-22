import React from "react";
import styled from "styled-components";

const ChipButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.color.brand500 : theme.color.border};
  background: ${({ $active, theme }) =>
    $active ? theme.color.brand500 : theme.color.bg};
  color: ${({ $active, theme }) => ($active ? "white" : theme.color.text)};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.color.brand600 : theme.color.grey50};
    border-color: ${({ theme }) => theme.color.brand500};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  border-radius: ${({ theme }) => theme.radii.round};
  background: ${({ theme }) => theme.color.bg};
  color: ${({ theme }) => theme.color.brand500};
  font-size: 0.75rem;
  font-weight: 600;
`;

interface FilterChipProps {
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  count?: number;
  showCountWhenInactive?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function FilterChip({
  active = false,
  onClick,
  icon,
  count,
  showCountWhenInactive = true,
  disabled = false,
  className,
  children,
}: FilterChipProps) {
  const shouldShowCount =
    count !== undefined && (active || showCountWhenInactive);

  return (
    <ChipButton
      $active={active}
      onClick={onClick}
      disabled={disabled}
      className={className}
      type="button"
    >
      {icon}
      {children}
      {shouldShowCount && <CountBadge>{count}</CountBadge>}
    </ChipButton>
  );
}
