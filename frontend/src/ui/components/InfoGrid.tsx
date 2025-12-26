import styled from "styled-components";

interface InfoGridProps {
  items: Array<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
  }>;
  columns?: 2 | 3 | 4;
}

const Grid = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Item = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Label = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Value = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export default function InfoGrid({ items, columns = 3 }: InfoGridProps) {
  return (
    <Grid $columns={columns}>
      {items.map((item, idx) => (
        <Item key={idx}>
          <Label>{item.label}</Label>
          <Value>
            {item.icon}
            {item.value}
          </Value>
        </Item>
      ))}
    </Grid>
  );
}
