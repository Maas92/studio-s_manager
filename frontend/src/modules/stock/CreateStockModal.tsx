import React, { useState, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { CreateStockItemInput, StockLocation } from "./api";

interface CreateStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (values: CreateStockItemInput) => void;
  creating?: boolean;
}

const Form = styled.form`
  display: grid;
  gap: 1.5rem;
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
  color: ${({ theme }) => theme.color.red500};
  margin-left: 4px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400};
  }

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400};
  }

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }

  &::placeholder {
    color: ${({ theme }) => theme.color.mutedText};
    opacity: 0.7;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const HintText = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-top: 0.25rem;
`;

const INITIAL_FORM: CreateStockItemInput = {
  name: "",
  sku: "",
  category: "",
  location: "storage",
  quantity: 0,
  minQuantity: undefined,
  unit: "units",
  cost: undefined,
  retailPrice: undefined,
  supplier: "",
  notes: "",
};

export default function CreateStockModal({
  isOpen,
  onClose,
  onCreate,
  creating = false,
}: CreateStockModalProps) {
  const [formValues, setFormValues] =
    useState<CreateStockItemInput>(INITIAL_FORM);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formValues.name) return;
      onCreate(formValues);
    },
    [formValues, onCreate]
  );

  const handleClose = useCallback(() => {
    setFormValues(INITIAL_FORM);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Stock Item"
      size="lg"
      ariaLabel="Add new stock item"
    >
      <Form onSubmit={handleSubmit}>
        {/* Name & SKU */}
        <Grid>
          <FormField>
            <Label htmlFor="stock-name">
              Item Name <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Input
              id="stock-name"
              value={formValues.name}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Lavender Essential Oil"
              required
              autoFocus
            />
          </FormField>

          <FormField>
            <Label htmlFor="stock-sku">SKU</Label>
            <Input
              id="stock-sku"
              value={formValues.sku}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, sku: e.target.value }))
              }
              placeholder="e.g., LEO-001"
            />
          </FormField>
        </Grid>

        {/* Category & Location */}
        <Grid>
          <FormField>
            <Label htmlFor="stock-category">Category</Label>
            <Input
              id="stock-category"
              value={formValues.category}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, category: e.target.value }))
              }
              placeholder="e.g., Essential Oils"
            />
          </FormField>

          <FormField>
            <Label htmlFor="stock-location">
              Location <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Select
              id="stock-location"
              value={formValues.location}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  location: e.target.value as StockLocation,
                }))
              }
              required
            >
              <option value="storage">Storage (Receiving)</option>
              <option value="retail">Retail Floor</option>
              <option value="treatment">Treatment Rooms</option>
            </Select>
            <HintText>New items typically start in Storage</HintText>
          </FormField>
        </Grid>

        {/* Quantity & Min Quantity */}
        <Grid>
          <FormField>
            <Label htmlFor="stock-quantity">
              Initial Quantity <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Input
              id="stock-quantity"
              type="number"
              min="0"
              value={formValues.quantity}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  quantity: Number(e.target.value),
                }))
              }
              required
            />
          </FormField>

          <FormField>
            <Label htmlFor="stock-min-quantity">Minimum Quantity</Label>
            <Input
              id="stock-min-quantity"
              type="number"
              min="0"
              value={formValues.minQuantity || ""}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  minQuantity: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
              placeholder="Low stock alert threshold"
            />
            <HintText>You'll be alerted when stock falls below this</HintText>
          </FormField>
        </Grid>

        {/* Unit & Supplier */}
        <Grid>
          <FormField>
            <Label htmlFor="stock-unit">Unit</Label>
            <Input
              id="stock-unit"
              value={formValues.unit}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, unit: e.target.value }))
              }
              placeholder="e.g., bottles, ml, boxes"
            />
          </FormField>

          <FormField>
            <Label htmlFor="stock-supplier">Supplier</Label>
            <Input
              id="stock-supplier"
              value={formValues.supplier}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, supplier: e.target.value }))
              }
              placeholder="Supplier name"
            />
          </FormField>
        </Grid>

        {/* Cost & Retail Price */}
        <Grid>
          <FormField>
            <Label htmlFor="stock-cost">Cost Price ($)</Label>
            <Input
              id="stock-cost"
              type="number"
              step="0.01"
              min="0"
              value={formValues.cost || ""}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  cost: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="0.00"
            />
            <HintText>Your cost per unit</HintText>
          </FormField>

          <FormField>
            <Label htmlFor="stock-retail-price">Retail Price ($)</Label>
            <Input
              id="stock-retail-price"
              type="number"
              step="0.01"
              min="0"
              value={formValues.retailPrice || ""}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  retailPrice: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
              placeholder="0.00"
            />
            <HintText>Selling price per unit</HintText>
          </FormField>
        </Grid>

        {/* Notes */}
        <FormField>
          <Label htmlFor="stock-notes">Notes</Label>
          <TextArea
            id="stock-notes"
            value={formValues.notes}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Add any additional notes about this item..."
          />
        </FormField>

        {/* Actions */}
        <Actions>
          <Button
            variation="secondary"
            type="button"
            onClick={handleClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            variation="primary"
            type="submit"
            disabled={creating || !formValues.name}
          >
            {creating ? "Adding..." : "Add Stock Item"}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
