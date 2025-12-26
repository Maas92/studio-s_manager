import styled from "styled-components";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  variant?: "success" | "info" | "warning" | "danger";
  iconColor?: string;
  valueColor?: string;
}

const Card = styled.div<{
  $variant?: "success" | "info" | "warning" | "danger";
}>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-left: 3px solid
    ${({ $variant, theme }) => {
      switch ($variant) {
        case "success":
          return theme.color.green500;
        case "warning":
          return theme.color.yellow700;
        case "danger":
          return theme.color.red600;
        case "info":
          return theme.color.blue500;
        default:
          return theme.color.brand600;
      }
    }};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Label = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const IconWrapper = styled.div<{ $color?: string }>`
  color: ${({ $color }) => $color};
`;

const Value = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.color.text};
  line-height: 1;
`;

const Subtext = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  variant,
  iconColor,
  valueColor,
}: StatCardProps) {
  return (
    <Card $variant={variant}>
      <Header>
        <Label>{label}</Label>
        <IconWrapper $color={iconColor}>{icon}</IconWrapper>
      </Header>
      <Value $color={valueColor}>{value}</Value>
      {subtext && <Subtext>{subtext}</Subtext>}
    </Card>
  );
}
