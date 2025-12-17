import React, { useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import {
  CreditCard,
  DollarSign,
  Percent,
  Gift,
  AlertCircle,
  Check,
  ArrowLeft,
  Edit2,
  Tag as TagIcon,
} from "lucide-react";

import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import Card from "../../ui/components/Card";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const SidePanel = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadowMd};
  position: sticky;
  top: 1rem;
  height: fit-content;
`;

const PageTitle = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
`;

const PageSubtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.95rem;
`;

const SectionCard = styled(Card)`
  padding: 1.5rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OrderList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child {
    border-bottom: none;
  }
`;

const OrderItemInfo = styled.div`
  flex: 1;
`;

const OrderItemName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;
`;

const OrderItemMeta = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const OrderItemPrice = styled.div`
  text-align: right;
`;

const OrderItemAmount = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  font-size: 1.125rem;
`;

const OrderItemQty = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-top: 0.25rem;
`;

const DiscountRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: flex-end;
`;

const PaymentMethodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const MethodButton = styled.button<{ $active: boolean }>`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 2px solid
    ${({ $active, theme }) =>
      $active ? theme.color.brand600 : theme.color.border};
  background: ${({ $active, theme }) =>
    $active ? theme.color.brand500 : theme.color.panel};
  color: ${({ $active }) => ($active ? "#ffffff" : "inherit")};
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.brand500};
    background: ${({ $active, theme }) =>
      $active ? theme.color.brand600 : theme.color.brand50};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const TotalDisplay = styled.div`
  text-align: center;
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 2px solid ${({ theme }) => theme.color.brand200};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1.5rem;
`;

const TotalLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.5rem;
`;

const TotalAmount = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.brand600};
`;

const SummaryList = styled.div`
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const SummaryRow = styled.div<{ $isTotal?: boolean }>`
  display: flex;
  justify-content: space-between;
  font-size: ${({ $isTotal }) => ($isTotal ? "1.125rem" : "0.9375rem")};
  font-weight: ${({ $isTotal }) => ($isTotal ? 700 : 400)};
  color: ${({ theme, $isTotal }) =>
    $isTotal ? theme.color.text : theme.color.mutedText};
  padding-top: ${({ $isTotal }) => ($isTotal ? "0.75rem" : "0")};
  border-top: ${({ $isTotal, theme }) =>
    $isTotal ? `2px solid ${theme.color.border}` : "none"};
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.red100 || "#fee2e2"};
  border: 1px solid ${({ theme }) => theme.color.red500 || "#ef4444"};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.red600 || "#b91c1c"};
  font-size: 0.875rem;
  margin-bottom: 1rem;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const WarningBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.yellow100 || "#fef3c7"};
  border: 1px solid ${({ theme }) => theme.color.yellow700 || "#a16207"};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.grey900 || "#111827"};
  font-size: 0.875rem;
  margin-bottom: 1rem;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const SuccessBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.color.green100 || "#dcfce7"};
  border: 1px solid ${({ theme }) => theme.color.green500 || "#22c55e"};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.green700 || "#15803d"};
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.75rem;
`;

const Actions = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const BackActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.text};
`;

const HintText = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

// ============================================================================
// TYPES
// ============================================================================

interface PaymentReviewProps {
  cart: any[];
  client: any;
  discount: { type: "percentage" | "fixed"; value: number; reason: string };
  tips: Record<string, number>;
  loyaltyPointsToRedeem: number;
  onUpdateDiscount: (discount: any) => void;
  onUpdateTips: (tips: Record<string, number>) => void;
  onUpdateLoyaltyRedemption: (points: number) => void;
  onComplete: (payments: any[]) => void;
  onBack: () => void;
  onEditCart: () => void;
  processing?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PaymentReview({
  cart,
  client,
  discount,
  tips,
  loyaltyPointsToRedeem,
  onUpdateDiscount,
  onUpdateTips,
  onUpdateLoyaltyRedemption,
  onComplete,
  onBack,
  onEditCart,
  processing = false,
}: PaymentReviewProps) {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "split">(
    "card"
  );
  const [cashReceived, setCashReceived] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate totals
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (discount.type === "percentage") {
      return (subtotal * discount.value) / 100;
    }
    return discount.value;
  }, [discount, subtotal]);

  const loyaltyValue = useMemo(
    () => (loyaltyPointsToRedeem || 0) * 0.01,
    [loyaltyPointsToRedeem]
  );

  const afterDiscount = useMemo(
    () => Math.max(0, subtotal - discountAmount - loyaltyValue),
    [subtotal, discountAmount, loyaltyValue]
  );

  const tax = useMemo(() => afterDiscount * 0.15, [afterDiscount]);

  const tipsTotal = useMemo(
    () => Object.values(tips || {}).reduce((sum, tip) => sum + tip, 0),
    [tips]
  );

  const total = useMemo(
    () => afterDiscount + tax + tipsTotal,
    [afterDiscount, tax, tipsTotal]
  );

  const cashChange = useMemo(() => {
    const received = parseFloat(cashReceived || "0");
    return Math.max(0, received - total);
  }, [cashReceived, total]);

  // Validation
  const canProceed = useMemo(() => {
    const errors: string[] = [];

    if (cart.length === 0) {
      errors.push("Cart is empty");
    }

    if (paymentMethod === "cash") {
      const received = parseFloat(cashReceived || "0");
      if (!cashReceived || received === 0) {
        errors.push("Please enter cash received amount");
      } else if (received < total) {
        errors.push(
          `Insufficient cash. Need $${(total - received).toFixed(2)} more`
        );
      }
    }

    if (discount.value > 0) {
      if (discount.type === "percentage" && discount.value > 100) {
        errors.push("Discount cannot exceed 100%");
      }
      if (discount.type === "fixed" && discount.value > subtotal) {
        errors.push("Discount cannot exceed subtotal");
      }
      // Large discounts require reason
      if (discountAmount > subtotal * 0.5 && !discount.reason) {
        errors.push("Large discounts (>50%) require a reason");
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [
    cart,
    paymentMethod,
    cashReceived,
    total,
    discount,
    discountAmount,
    subtotal,
  ]);

  const handleComplete = useCallback(() => {
    if (!canProceed || processing) return;

    const payments = [
      {
        method: paymentMethod,
        amount: total,
      },
    ];

    onComplete(payments);
  }, [canProceed, processing, paymentMethod, total, onComplete]);

  return (
    <Container>
      <MainContent>
        <div>
          <PageTitle>Review & Payment</PageTitle>
          <PageSubtitle>
            Client: <strong>{client?.name || "Walk-in"}</strong>
          </PageSubtitle>
        </div>

        {/* Order Summary */}
        <SectionCard>
          <SectionTitle>
            <TagIcon size={18} />
            Order Summary
          </SectionTitle>
          <OrderList>
            {cart.map((item, idx) => (
              <OrderItem key={`${item.id}-${item.type}-${idx}`}>
                <OrderItemInfo>
                  <OrderItemName>{item.name}</OrderItemName>
                  {item.staffName && (
                    <OrderItemMeta>Staff: {item.staffName}</OrderItemMeta>
                  )}
                  {item.duration && (
                    <OrderItemMeta>{item.duration} minutes</OrderItemMeta>
                  )}
                </OrderItemInfo>
                <OrderItemPrice>
                  <OrderItemAmount>
                    ${(item.price * item.quantity).toFixed(2)}
                  </OrderItemAmount>
                  <OrderItemQty>Qty: {item.quantity}</OrderItemQty>
                </OrderItemPrice>
              </OrderItem>
            ))}
          </OrderList>
        </SectionCard>

        {/* Discount Section */}
        <SectionCard>
          <SectionTitle>
            <Percent size={18} />
            Discount (Optional)
          </SectionTitle>
          <DiscountRow>
            <FormField>
              <Label htmlFor="discount-type">Type</Label>
              <select
                id="discount-type"
                value={discount.type}
                onChange={(e) =>
                  onUpdateDiscount({
                    ...discount,
                    type: e.target.value as "percentage" | "fixed",
                  })
                }
                style={{
                  padding: "0.8rem 1.2rem",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  fontSize: "1rem",
                }}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </FormField>
            <FormField>
              <Label htmlFor="discount-value">
                {discount.type === "percentage" ? "Percent" : "Amount"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min="0"
                max={discount.type === "percentage" ? "100" : String(subtotal)}
                step={discount.type === "percentage" ? "1" : "0.01"}
                value={discount.value || ""}
                onChange={(e) =>
                  onUpdateDiscount({
                    ...discount,
                    value: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </FormField>
          </DiscountRow>
          {discount.value > 0 && discountAmount > subtotal * 0.3 && (
            <FormField style={{ marginTop: "1rem" }}>
              <Label htmlFor="discount-reason">
                Reason (Required for large discounts)
              </Label>
              <Input
                id="discount-reason"
                value={discount.reason || ""}
                onChange={(e) =>
                  onUpdateDiscount({ ...discount, reason: e.target.value })
                }
                placeholder="e.g., Loyalty reward, Manager approval"
              />
            </FormField>
          )}
        </SectionCard>

        {/* Loyalty Points */}
        {client?.loyaltyPoints > 0 && (
          <SectionCard>
            <SectionTitle>
              <Gift size={18} />
              Loyalty Points
            </SectionTitle>
            <FormField>
              <Label htmlFor="loyalty-redeem">
                Redeem Points (Available: {client.loyaltyPoints})
              </Label>
              <Input
                id="loyalty-redeem"
                type="number"
                min="0"
                max={client.loyaltyPoints}
                value={loyaltyPointsToRedeem || ""}
                onChange={(e) =>
                  onUpdateLoyaltyRedemption(parseInt(e.target.value) || 0)
                }
                placeholder="0"
              />
              <HintText>100 points = $1.00</HintText>
            </FormField>
          </SectionCard>
        )}
      </MainContent>

      {/* Side Panel - Payment */}
      <SidePanel>
        <TotalDisplay>
          <TotalLabel>Total Amount</TotalLabel>
          <TotalAmount>${total.toFixed(2)}</TotalAmount>
        </TotalDisplay>

        <SummaryList>
          <SummaryRow>
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </SummaryRow>
          {discountAmount > 0 && (
            <SummaryRow>
              <span>Discount:</span>
              <span style={{ color: "var(--color-green500)" }}>
                -${discountAmount.toFixed(2)}
              </span>
            </SummaryRow>
          )}
          {loyaltyValue > 0 && (
            <SummaryRow>
              <span>Loyalty Points:</span>
              <span style={{ color: "var(--color-green500)" }}>
                -${loyaltyValue.toFixed(2)}
              </span>
            </SummaryRow>
          )}
          <SummaryRow>
            <span>Tax (15%):</span>
            <span>${tax.toFixed(2)}</span>
          </SummaryRow>
          {tipsTotal > 0 && (
            <SummaryRow>
              <span>Tips:</span>
              <span>${tipsTotal.toFixed(2)}</span>
            </SummaryRow>
          )}
          <SummaryRow $isTotal>
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </SummaryRow>
        </SummaryList>

        <SectionTitle style={{ marginBottom: "0.75rem" }}>
          <CreditCard size={18} />
          Payment Method
        </SectionTitle>

        <PaymentMethodGrid>
          <MethodButton
            $active={paymentMethod === "card"}
            onClick={() => setPaymentMethod("card")}
            type="button"
          >
            <CreditCard size={20} />
            Card
          </MethodButton>
          <MethodButton
            $active={paymentMethod === "cash"}
            onClick={() => setPaymentMethod("cash")}
            type="button"
          >
            <DollarSign size={20} />
            Cash
          </MethodButton>
          <MethodButton
            $active={paymentMethod === "split"}
            onClick={() => setPaymentMethod("split")}
            type="button"
            disabled
          >
            Split
          </MethodButton>
        </PaymentMethodGrid>

        {paymentMethod === "cash" && (
          <FormField style={{ marginBottom: "1rem" }}>
            <Label htmlFor="cash-received">Cash Received</Label>
            <Input
              id="cash-received"
              type="number"
              step="0.01"
              min="0"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              placeholder={`$${total.toFixed(2)}`}
              hasError={cashReceived !== "" && parseFloat(cashReceived) < total}
            />
            {cashReceived && parseFloat(cashReceived) >= total && (
              <SuccessBox>
                <Check size={16} />
                Change: ${cashChange.toFixed(2)}
              </SuccessBox>
            )}
          </FormField>
        )}

        {validationErrors.length > 0 && (
          <ErrorBox>
            <AlertCircle size={18} />
            <div>
              <strong>Cannot proceed:</strong>
              <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.25rem" }}>
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </ErrorBox>
        )}

        <Actions>
          <Button
            variation="primary"
            size="large"
            onClick={handleComplete}
            disabled={!canProceed || processing}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <Check size={18} />
            {processing ? "Processing..." : "Complete Payment"}
          </Button>

          <BackActions>
            <Button
              variation="secondary"
              size="medium"
              onClick={onBack}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <Button
              variation="secondary"
              size="medium"
              onClick={onEditCart}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Edit2 size={16} />
              Edit Cart
            </Button>
          </BackActions>
        </Actions>
      </SidePanel>
    </Container>
  );
}
