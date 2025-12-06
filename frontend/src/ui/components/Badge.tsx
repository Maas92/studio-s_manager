import styled from "styled-components";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "active"
  | "inactive"
  | "on_leave"
  | "retail"
  | "treatment"
  | "storage"
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed";

interface BadgeProps {
  $variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: "#f3f4f6", color: "#374151" },
  success: { bg: "#dcfce7", color: "#15803d" },
  warning: { bg: "#fef3c7", color: "#a16207" },
  danger: { bg: "#fee2e2", color: "#b91c1c" },
  info: { bg: "#dbeafe", color: "#1d4ed8" },
  active: { bg: "#dcfce7", color: "#15803d" },
  inactive: { bg: "#f3f4f6", color: "#374151" },
  on_leave: { bg: "#fef3c7", color: "#a16207" },
  retail: { bg: "#dbeafe", color: "#1d4ed8" },
  treatment: { bg: "#dcfce7", color: "#15803d" },
  storage: { bg: "#fef3c7", color: "#a16207" },
  confirmed: { bg: "#dcfce7", color: "#15803d" },
  pending: { bg: "#fef3c7", color: "#a16207" },
  cancelled: { bg: "#fee2e2", color: "#b91c1c" },
  completed: { bg: "#dbeafe", color: "#1d4ed8" },
};

export const Badge = styled.span<BadgeProps>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
  background: ${({ $variant = "default" }) => variantStyles[$variant].bg};
  color: ${({ $variant = "default" }) => variantStyles[$variant].color};
`;

export default Badge;
