import React, { useState, useCallback, useEffect } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { StockItem, StockLocation, TransferStockInput } from "./api";
import { ArrowRight, Package, MapPin, AlertCircle } from "lucide-react";

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (transfer: TransferStockInput) => void;
  transferring?: boolean;
  preselectedItem?: StockItem | null;
  stockItems?: StockItem[];
}

const Form = styled.form`
  display: grid;
  gap: 1.25rem;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};
`;

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.color.red500 || "#ef4444"};
  margin-left: 4px;
`;

const Select = styled.select`
  width: 100%;
  min-height: 46px;
  padding: 0.8rem 1.2rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  box-shadow: ${({ theme }) => theme.shadowSm};
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  cursor: pointer;
  transition: box-shadow 0.12s ease, border-color 0.12s ease;

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TransferFlow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.md};
  margin: 0.5rem 0;
`;

const LocationBox = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const LocationLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
`;

const LocationValue = styled.div<{ $color?: string }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $color }) => $color || "#3b82f6"};
  color: white;
  font-weight: 600;
  text-transform: capitalize;
`;

const ArrowIcon = styled.div`
  color: ${({ theme }) => theme.color.brand600 || "#2563eb"};
`;

const StockInfo = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.blue100 || "#eff6ff"};
  border-radius: ${({ theme }) => theme.radii.sm};
  border-left: 3px solid ${({ theme }) => theme.color.blue500 || "#2563eb"};
`;

const StockInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const WarningBox = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.yellow100 || "#fefce8"};
  border-radius: ${({ theme }) => theme.radii.sm};
  border-left: 3px solid ${({ theme }) => theme.color.yellow700 || "#ca8a04"};
  color: ${({ theme }) => theme.color.yellow700 || "#713f12"};
  font-size: 0.875rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.8rem 1.2rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  box-shadow: ${({ theme }) => theme.shadowSm};
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  transition: box-shadow 0.12s ease, border-color 0.12s ease;
  box-sizing: border-box;

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const LOCATION_COLORS: Record<StockLocation, string> = {
  retail: "#3b82f6",
  treatment: "#10b981",
  storage: "#f59e0b",
};

const INITIAL_FORM: Omit<TransferStockInput, "itemId"> = {
  fromLocation: "storage",
  toLocation: "retail",
  quantity: 1,
  notes: "",
};

export default function TransferStockModal({
  isOpen,
  onClose,
  onTransfer,
  transferring = false,
  preselectedItem,
  stockItems = [],
}: TransferStockModalProps) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [fromLocation, setFromLocation] = useState<StockLocation>("storage");
  const [toLocation, setToLocation] = useState<StockLocation>("retail");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Reset and set preselected item when modal opens
  useEffect(() => {
    if (isOpen && preselectedItem) {
      setSelectedItemId(preselectedItem.id);
      setFromLocation(preselectedItem.location);
      setToLocation(
        preselectedItem.location === "retail" ? "treatment" : "retail"
      );
      setQuantity(1);
      setNotes("");
    } else if (isOpen && !preselectedItem) {
      setSelectedItemId("");
      setFromLocation("storage");
      setToLocation("retail");
      setQuantity(1);
      setNotes("");
    }
  }, [isOpen, preselectedItem]);

  const selectedItem = stockItems.find((item) => item.id === selectedItemId);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedItemId || !quantity) return;

      onTransfer({
        itemId: selectedItemId,
        fromLocation,
        toLocation,
        quantity,
        notes: notes || undefined,
      });
    },
    [selectedItemId, fromLocation, toLocation, quantity, notes, onTransfer]
  );

  const handleClose = useCallback(() => {
    setSelectedItemId("");
    setFromLocation("storage");
    setToLocation("retail");
    setQuantity(1);
    setNotes("");
    onClose();
  }, [onClose]);

  const isValid = selectedItemId && quantity > 0 && fromLocation !== toLocation;
  const hasInsufficientStock = selectedItem && quantity > selectedItem.quantity;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transfer Stock"
      size="md"
      ariaLabel="Transfer stock between locations"
    >
      <Form onSubmit={handleSubmit}>
        {/* Item Selection */}
        <FormField>
          <Label htmlFor="transfer-item">
            Select Item
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Select
            id="transfer-item"
            value={selectedItemId}
            onChange={(e) => {
              const itemId = e.target.value;
              setSelectedItemId(itemId);
              const item = stockItems.find((i) => i.id === itemId);
              if (item) {
                setFromLocation(item.location);
                setToLocation(
                  item.location === "retail" ? "treatment" : "retail"
                );
              }
            }}
            required
            disabled={!!preselectedItem}
          >
            <option value="">Select an item...</option>
            {stockItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.location} ({item.quantity}{" "}
                {item.unit || "units"})
              </option>
            ))}
          </Select>
        </FormField>

        {/* Stock Info */}
        {selectedItem && (
          <StockInfo>
            <StockInfoRow>
              <Package size={16} />
              <strong>{selectedItem.name}</strong>
            </StockInfoRow>
            <StockInfoRow>
              <MapPin size={16} />
              Current: {selectedItem.location} • Available:{" "}
              {selectedItem.quantity} {selectedItem.unit || "units"}
            </StockInfoRow>
          </StockInfo>
        )}

        {/* Transfer Flow Visualization */}
        {selectedItemId && (
          <TransferFlow>
            <LocationBox>
              <LocationLabel>From</LocationLabel>
              <LocationValue $color={LOCATION_COLORS[fromLocation]}>
                {fromLocation}
              </LocationValue>
            </LocationBox>

            <ArrowIcon>
              <ArrowRight size={24} />
            </ArrowIcon>

            <LocationBox>
              <LocationLabel>To</LocationLabel>
              <LocationValue $color={LOCATION_COLORS[toLocation]}>
                {toLocation}
              </LocationValue>
            </LocationBox>
          </TransferFlow>
        )}

        {/* Location Selection */}
        <FormField>
          <Label htmlFor="transfer-to">
            Transfer To
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Select
            id="transfer-to"
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value as StockLocation)}
            required
          >
            <option value="retail">Retail</option>
            <option value="treatment">Treatment</option>
            <option value="storage">Storage</option>
          </Select>
        </FormField>

        {/* Quantity */}
        <FormField>
          <Label htmlFor="transfer-quantity">
            Quantity
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Input
            id="transfer-quantity"
            type="number"
            min="1"
            max={selectedItem?.quantity || undefined}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </FormField>

        {/* Warning for insufficient stock */}
        {hasInsufficientStock && (
          <WarningBox>
            <AlertCircle size={20} />
            <div>
              <strong>Insufficient Stock!</strong>
              <br />
              Only {selectedItem.quantity} {selectedItem.unit || "units"}{" "}
              available in {fromLocation}.
            </div>
          </WarningBox>
        )}

        {/* Notes */}
        <FormField>
          <Label htmlFor="transfer-notes">Notes (Optional)</Label>
          <TextArea
            id="transfer-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this transfer..."
          />
        </FormField>

        {/* Actions */}
        <Actions>
          <Button
            variation="secondary"
            type="button"
            onClick={handleClose}
            disabled={transferring}
          >
            Cancel
          </Button>
          <Button
            variation="primary"
            type="submit"
            disabled={transferring || !isValid || hasInsufficientStock}
          >
            {transferring ? "Transferring..." : "Transfer Stock"}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
