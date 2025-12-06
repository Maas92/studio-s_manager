import React from "react";
import styled from "styled-components";

interface FilterBarProps {
  filters: Array<{ value: string; label: string; count?: number }>;
  activeFilter: string;
  onFilterChange: (value: string) => void;
  className?: string;
}

const Container = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.color.brand600 : theme.color.border};
  background: ${({ theme, $active }) =>
    $active ? theme.color.brand50 : theme.color.panel};
  color: ${({ theme, $active }) =>
    $active ? theme.color.brand700 : theme.color.text};
  font-weight: ${({ $active }) => ($active ? "600" : "500")};
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.875rem;
  text-transform: capitalize;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand600};
    background: ${({ theme }) => theme.color.brand50};
  }
`;

export default function FilterBar({
  filters,
  activeFilter,
  onFilterChange,
  className,
}: FilterBarProps) {
  return (
    <Container className={className}>
      {filters.map((filter) => (
        <FilterButton
          key={filter.value}
          $active={activeFilter === filter.value}
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
          {filter.count !== undefined && ` (${filter.count})`}
        </FilterButton>
      ))}
    </Container>
  );
}
