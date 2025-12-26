import styled from "styled-components";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "default";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const StyledBadge = styled.span<{ $variant: BadgeVariant }>`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case "success":
        return theme.color.green100 || "#dcfce7";
      case "warning":
        return theme.color.yellow100 || "#fef3c7";
      case "danger":
        return theme.color.red100 || "#fee2e2";
      case "info":
        return theme.color.blue100 || "#dbeafe";
      default:
        return theme.color.grey100 || "#f3f4f6";
    }
  }};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case "success":
        return theme.color.green700 || "#15803d";
      case "warning":
        return theme.color.yellow700 || "#a16207";
      case "danger":
        return theme.color.red600 || "#dc2626";
      case "info":
        return theme.color.blue500 || "#1d4ed8";
      default:
        return theme.color.grey700 || "#374151";
    }
  }};
`;

export default function Badge({ children, variant = "default" }: BadgeProps) {
  return <StyledBadge $variant={variant}>{children}</StyledBadge>;
}
