import React from "react";
import styled from "styled-components";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PageTitle = styled.h2`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

export default function PageHeader({
  title,
  children,
  className,
}: PageHeaderProps) {
  return (
    <HeaderRow className={className}>
      <PageTitle>{title}</PageTitle>
      {children}
    </HeaderRow>
  );
}
