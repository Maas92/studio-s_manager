import styled from "styled-components";

interface TagProps {
  children: React.ReactNode;
  variant?: "default" | "benefit" | "warning";
  icon?: React.ReactNode;
}

const StyledTag = styled.span<{ $variant: "default" | "benefit" | "warning" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case "benefit":
        return theme.color.green100 || "#dcfce7";
      case "warning":
        return theme.color.red100 || "#fee2e2";
      default:
        return theme.color.brand100 || "#dbeafe";
    }
  }};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case "benefit":
        return theme.color.green700 || "#15803d";
      case "warning":
        return theme.color.red600 || "#b91c1c";
      default:
        return theme.color.brand700 || "#1d4ed8";
    }
  }};
  border: 1px solid
    ${({ $variant, theme }) => {
      switch ($variant) {
        case "benefit":
          return theme.color.green100 || "#bbf7d0";
        case "warning":
          return theme.color.red200 || "#fecaca";
        default:
          return theme.color.brand200 || "#bfdbfe";
      }
    }};
`;

export default function Tag({ children, variant = "default", icon }: TagProps) {
  return (
    <StyledTag $variant={variant}>
      {icon}
      {children}
    </StyledTag>
  );
}
