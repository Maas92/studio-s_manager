import React from "react";
import styled from "styled-components";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const Container = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const IconWrapper = styled.div`
  margin: 0 auto 1rem;
  opacity: 0.5;
`;

const Title = styled.p`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
`;

const Description = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
`;

export default function EmptyState({
  icon: Icon,
  title = "No items found",
  description,
  action,
}: EmptyStateProps) {
  return (
    <Container>
      {Icon && (
        <IconWrapper>
          <Icon size={48} />
        </IconWrapper>
      )}
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {action}
    </Container>
  );
}
