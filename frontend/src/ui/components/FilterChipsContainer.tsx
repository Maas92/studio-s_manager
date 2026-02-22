import React from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
`;

interface FilterChipsContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function FilterChipsContainer({
  children,
  className,
}: FilterChipsContainerProps) {
  return <Container className={className}>{children}</Container>;
}