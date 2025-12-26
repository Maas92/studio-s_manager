import styled from "styled-components";

interface StatsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

const Section = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const Title = styled.h4`
  margin: 0 0 1.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Grid = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export default function StatsSection({
  title,
  icon,
  children,
  columns = 4,
}: StatsSectionProps) {
  return (
    <Section>
      <Title>
        {icon}
        {title}
      </Title>
      <Grid $columns={columns}>{children}</Grid>
    </Section>
  );
}
