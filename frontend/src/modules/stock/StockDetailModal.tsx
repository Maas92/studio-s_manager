import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import styled from "styled-components";
import type { StockItem } from "./api";
import {
  Package,
  MapPin,
  Hash,
  DollarSign,
  User,
  Calendar,
  FileText,
  ArrowRightLeft,
} from "lucide-react";

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem | null;
  onTransfer: (item: StockItem) => void;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const Section = styled.div`
  display: grid;
  gap: 1rem;
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InfoValue = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};
`;

const Badge = styled.span<{
  $variant: "success" | "warning" | "danger" | "info";
}>`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
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
        return theme.color.red500 || "#fee2e2";
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
        return theme.color.red500 || "#b91c1c";
      case "info":
        return theme.color.blue500 || "#1d4ed8";
      default:
        return theme.color.grey700 || "#374151";
    }
  }};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const StockLevel = styled.div<{ $level: "low" | "medium" | "high" }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $level, theme }) => {
    switch ($level) {
      case "low":
        return theme.color.red600 || "#fef2f2";
      case "medium":
        return theme.color.yellow100 || "#fefce8";
      case "high":
        return theme.color.green500 || "#f0fdf4";
    }
  }};
  border-left: 3px solid
    ${({ $level, theme }) => {
      switch ($level) {
        case "low":
          return theme.color.red600 || "#dc2626";
        case "medium":
          return theme.color.yellow700 || "#ca8a04";
        case "high":
          return theme.color.green500 || "#16a34a";
      }
    }};
`;

function getStockLevel(
  quantity: number,
  minQuantity?: number
): "low" | "medium" | "high" {
  if (!minQuantity) return "high";
  if (quantity <= minQuantity) return "low";
  if (quantity <= minQuantity * 2) return "medium";
  return "high";
}

function getLocationColor(
  location: string
): "success" | "warning" | "danger" | "info" {
  switch (location) {
    case "retail":
      return "info";
    case "treatment":
      return "success";
    case "storage":
      return "warning";
    default:
      return "info";
  }
}

export default function StockDetailModal({
  isOpen,
  onClose,
  item,
  onTransfer,
}: StockDetailModalProps) {
  if (!item) return null;

  const stockLevel = getStockLevel(item.quantity, item.minQuantity);
  const locationColor = getLocationColor(item.location);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Item Details"
      size="md"
      ariaLabel="Stock item details"
    >
      <Content>
        {/* Stock Level Alert */}
        <StockLevel $level={stockLevel}>
          <Package size={20} />
          <div>
            <strong>
              {item.quantity} {item.unit || "units"}
            </strong>{" "}
            in stock
            {item.minQuantity && (
              <span style={{ marginLeft: "0.5rem", opacity: 0.8 }}>
                (Min: {item.minQuantity})
              </span>
            )}
          </div>
        </StockLevel>

        {/* Basic Info */}
        <Section>
          <SectionTitle>Basic Information</SectionTitle>
          <InfoGrid>
            <InfoItem>
              <InfoLabel>Item Name</InfoLabel>
              <InfoValue>
                <Package size={16} />
                <strong>{item.name}</strong>
              </InfoValue>
            </InfoItem>

            <InfoItem>
              <InfoLabel>Location</InfoLabel>
              <InfoValue>
                <MapPin size={16} />
                <Badge $variant={locationColor}>{item.location}</Badge>
              </InfoValue>
            </InfoItem>

            {item.sku && (
              <InfoItem>
                <InfoLabel>SKU</InfoLabel>
                <InfoValue>
                  <Hash size={16} />
                  {item.sku}
                </InfoValue>
              </InfoItem>
            )}

            {item.category && (
              <InfoItem>
                <InfoLabel>Category</InfoLabel>
                <InfoValue>{item.category}</InfoValue>
              </InfoItem>
            )}
          </InfoGrid>
        </Section>

        {/* Pricing */}
        {(item.cost || item.retailPrice) && (
          <Section>
            <SectionTitle>Pricing</SectionTitle>
            <InfoGrid>
              {item.cost && (
                <InfoItem>
                  <InfoLabel>Cost Price</InfoLabel>
                  <InfoValue>
                    <DollarSign size={16} />${item.cost.toFixed(2)}
                  </InfoValue>
                </InfoItem>
              )}

              {item.retailPrice && (
                <InfoItem>
                  <InfoLabel>Retail Price</InfoLabel>
                  <InfoValue>
                    <DollarSign size={16} />${item.retailPrice.toFixed(2)}
                  </InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
          </Section>
        )}

        {/* Additional Info */}
        {(item.supplier || item.lastRestocked) && (
          <Section>
            <SectionTitle>Additional Information</SectionTitle>
            <InfoGrid>
              {item.supplier && (
                <InfoItem>
                  <InfoLabel>Supplier</InfoLabel>
                  <InfoValue>
                    <User size={16} />
                    {item.supplier}
                  </InfoValue>
                </InfoItem>
              )}

              {item.lastRestocked && (
                <InfoItem>
                  <InfoLabel>Last Restocked</InfoLabel>
                  <InfoValue>
                    <Calendar size={16} />
                    {new Date(item.lastRestocked).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
          </Section>
        )}

        {/* Notes */}
        {item.notes && (
          <Section>
            <SectionTitle>Notes</SectionTitle>
            <InfoValue>
              <FileText size={16} />
              {item.notes}
            </InfoValue>
          </Section>
        )}

        {/* Actions */}
        <Actions>
          <Button variation="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variation="primary"
            onClick={() => {
              onTransfer(item);
              onClose();
            }}
          >
            <ArrowRightLeft size={16} />
            Transfer Stock
          </Button>
        </Actions>
      </Content>
    </Modal>
  );
}
