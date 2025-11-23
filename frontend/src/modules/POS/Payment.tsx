import React, { useState, useMemo } from "react";
import styled from "styled-components";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import toast from "react-hot-toast";
import {
  CreditCard,
  DollarSign,
  Check,
  AlertCircle,
  Percent,
  ArrowLeft,
  Gift,
  Edit2,
  Heart,
} from "lucide-react";
import type { CartItem, Discount, Tips, PaymentBreakdown } from "./api";
import {
  validateDiscount,
  calculateLoyaltyPoints,
  calculateLoyaltyValue,
} from "./api";

type PaymentMethod = "cash" | "card" | "split";

interface PaymentProps {
  cart: CartItem[];
  clientName?: string;
  clientLoyaltyPoints?: number;
  discount: Discount;
  tips: Tips;
  loyaltyPointsToRedeem: number;
  onUpdateDiscount: (discount: Discount) => void;
  onUpdateTips: (tips: Tips) => void;
  onUpdateLoyaltyRedemption: (points: number) => void;
  onComplete: (payments: PaymentBreakdown[]) => void;
  onBack: () => void;
  onEditCart: () => void;
  processing?: boolean;
}

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 480px;
  gap: 2.5rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const LeftPanel = styled.div`
  display: grid;
  gap: 2rem;
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
  margin: 0 0 0.5rem 0;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }
`;

const Section = styled.div`
  display: grid;
  gap: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    font-size: 1.125rem;
  }
`;

const OrderSummary = styled.div`
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey100};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`;

const OrderItem = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const ItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
`;

const ItemName = styled.div`
  font-weight: 700;
  font-size: 1rem;
  color: ${({ theme }) => theme.color.text};

  @media (max-width: 768px) {
    font-size: 0.9375rem;
  }
`;

const ItemMeta = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-top: 0.375rem;

  @media (max-width: 768px) {
    font-size: 0.8125rem;
  }
`;

const ItemPrice = styled.div`
  font-weight: 800;
  font-size: 1.125rem;
  color: ${({ theme }) => theme.color.brand500};
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const Card = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey100};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`;

const FormGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 140px;

  @media (max-width: 768px) {
    min-width: auto;
    font-size: 0.875rem;
  }
`;

const DiscountSelect = styled.select`
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.text};
  font-size: 0.9375rem;
  cursor: pointer;
  outline: none;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 0.875rem;
    padding: 0.625rem 0.875rem;
  }
`;

const RightPanel = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 2px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: sticky;
  top: 1rem;
  height: fit-content;

  @media (max-width: 1200px) {
    position: static;
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    gap: 1.5rem;
  }
`;

const TotalSection = styled.div`
  background: ${({ theme }) => theme.color.brand50};
  border: 2px solid ${({ theme }) => theme.color.brand500};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  text-align: center;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const TotalLabel = styled.div`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }
`;

const TotalAmount = styled.div`
  font-size: 3.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.brand600};
  line-height: 1;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Breakdown = styled.div`
  display: grid;
  gap: 0.875rem;
`;

const BreakdownRow = styled.div<{ $emphasis?: boolean }>`
  display: flex;
  justify-content: space-between;
  font-size: ${({ $emphasis }) => ($emphasis ? "1.25rem" : "1rem")};
  font-weight: ${({ $emphasis }) => ($emphasis ? 700 : 600)};
  color: ${({ theme }) => theme.color.text};
  padding-top: ${({ $emphasis }) => ($emphasis ? "1rem" : 0)};
  border-top: ${({ $emphasis, theme }) =>
    $emphasis ? `2px solid ${theme.color.border}` : "none"};

  @media (max-width: 768px) {
    font-size: ${({ $emphasis }) => ($emphasis ? "1.125rem" : "0.9375rem")};
  }
`;

const BreakdownLabel = styled.span<{ $positive?: boolean }>`
  color: ${({ $positive, theme }) =>
    $positive ? theme.color.green500 : theme.color.mutedText};
`;

const PaymentMethodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;
`;

const PaymentMethodButton = styled.button<{ $active: boolean }>`
  padding: 1.25rem 1rem;
  background: ${({ $active, theme }) =>
    $active ? theme.color.brand500 : theme.color.grey100};
  color: ${({ $active, theme }) => ($active ? "#ffffff" : theme.color.text)};
  border: 2px solid
    ${({ $active, theme }) =>
      $active ? theme.color.brand600 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: capitalize;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand500};
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 1rem 0.75rem;
    font-size: 0.875rem;
  }
`;

const QuickAmountGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const QuickAmountButton = styled.button`
  padding: 0.875rem;
  background: ${({ theme }) => theme.color.grey100};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.color.grey200};
    border-color: ${({ theme }) => theme.color.brand500};
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    font-size: 0.875rem;
  }
`;

const ChangeDisplay = styled.div`
  padding: 1.25rem;
  background: ${({ theme }) => theme.color.green500}20;
  border: 2px solid ${({ theme }) => theme.color.green500};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-top: 1rem;
`;

const ChangeLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
`;

const ChangeAmount = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.green500};

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LoyaltyBadge = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 1px solid ${({ theme }) => theme.color.brand300};
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9375rem;
`;

const StaffTipRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
`;

const SUGGESTED_AMOUNTS = [50, 100, 150, 200];

export default function Payment({
  cart,
  clientName,
  clientLoyaltyPoints = 0,
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
}: PaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [cashAmount, setCashAmount] = useState("");
  const [showDiscountReason, setShowDiscountReason] = useState(false);

  // Get unique staff from cart
  const staffMembers = useMemo(() => {
    const staffMap = new Map<string, string>();
    cart.forEach((item) => {
      if (item.staffId && item.staffName) {
        staffMap.set(item.staffId, item.staffName);
      }
    });
    return Array.from(staffMap.entries()).map(([id, name]) => ({ id, name }));
  }, [cart]);

  // Calculate totals
  const {
    subtotal,
    discountAmount,
    loyaltyRedemptionValue,
    tax,
    tipsTotal,
    total,
    loyaltyEarned,
  } = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const discountAmount =
      discount.type === "percentage"
        ? (subtotal * discount.value) / 100
        : discount.value;

    const loyaltyRedemptionValue = calculateLoyaltyValue(loyaltyPointsToRedeem);

    const afterDiscounts = Math.max(
      0,
      subtotal - discountAmount - loyaltyRedemptionValue
    );
    const tax = afterDiscounts * 0.15;

    const tipsTotal = Object.values(tips).reduce((sum, tip) => sum + tip, 0);

    const total = afterDiscounts + tax + tipsTotal;
    const loyaltyEarned = calculateLoyaltyPoints(total);

    return {
      subtotal,
      discountAmount,
      loyaltyRedemptionValue,
      tax,
      tipsTotal,
      total,
      loyaltyEarned,
    };
  }, [cart, discount, loyaltyPointsToRedeem, tips]);

  const change = useMemo(() => {
    const cash = parseFloat(cashAmount) || 0;
    return Math.max(0, cash - total);
  }, [cashAmount, total]);

  const canComplete = useMemo(() => {
    if (paymentMethod === "cash") {
      const cash = parseFloat(cashAmount) || 0;
      return cash >= total;
    }
    return true;
  }, [paymentMethod, cashAmount, total]);

  const handleDiscountChange = (
    type: "percentage" | "fixed",
    value: number
  ) => {
    const newDiscount = { ...discount, type, value };
    const validation = validateDiscount(newDiscount, subtotal);

    if (!validation.valid) {
      toast.error(validation.error || "Invalid discount");
      return;
    }

    // Show reason input if discount is large
    const discAmt = type === "percentage" ? (subtotal * value) / 100 : value;
    if (discAmt > subtotal * 0.5) {
      setShowDiscountReason(true);
    }

    onUpdateDiscount(newDiscount);
  };

  const handleComplete = () => {
    if (!canComplete || processing) return;

    // Validate discount reason if required
    if (discountAmount > subtotal * 0.5 && !discount.reason) {
      toast.error("Please provide a reason for large discounts");
      return;
    }

    const payments: PaymentBreakdown[] = [
      {
        method: paymentMethod,
        amount: total,
        reference: paymentMethod === "card" ? "Card Payment" : undefined,
      },
    ];

    if (paymentMethod === "cash") {
      const cash = parseFloat(cashAmount);
      if (cash < total) {
        toast.error("Insufficient cash amount");
        return;
      }
    }

    onComplete(payments);
  };

  const maxLoyaltyRedemption = Math.min(
    clientLoyaltyPoints,
    Math.floor(subtotal * 100) // Can't redeem more than subtotal
  );

  return (
    <Container>
      <LeftPanel>
        <div>
          <Title>Review & Payment</Title>
          <Subtitle>
            Review your order and complete payment
            {clientName && ` for ${clientName}`}
          </Subtitle>
        </div>

        {/* Order Summary */}
        <Section>
          <SectionTitle>
            Order Summary
            <Button
              variation="secondary"
              size="small"
              icon={<Edit2 size={16} />}
              onClick={onEditCart}
            >
              Edit Cart
            </Button>
          </SectionTitle>
          <OrderSummary>
            {cart.map((item, idx) => (
              <OrderItem key={`${item.id}-${item.type}-${idx}`}>
                <ItemRow>
                  <div style={{ flex: 1 }}>
                    <ItemName>{item.name}</ItemName>
                    <ItemMeta>
                      {item.clientName && `${item.clientName} • `}
                      {item.staffName && `${item.staffName} • `}
                      Qty: {item.quantity}
                    </ItemMeta>
                    {item.notes && (
                      <ItemMeta
                        style={{ marginTop: "0.5rem", fontStyle: "italic" }}
                      >
                        📝 {item.notes}
                      </ItemMeta>
                    )}
                  </div>
                  <ItemPrice>
                    ${(item.price * item.quantity).toFixed(2)}
                  </ItemPrice>
                </ItemRow>
              </OrderItem>
            ))}
          </OrderSummary>
        </Section>

        {/* Discount */}
        <Section>
          <SectionTitle>
            <Percent size={20} />
            Apply Discount
          </SectionTitle>
          <Card>
            <FormGrid>
              <FormRow>
                <DiscountSelect
                  value={discount.type}
                  onChange={(e) =>
                    handleDiscountChange(
                      e.target.value as "percentage" | "fixed",
                      discount.value
                    )
                  }
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </DiscountSelect>
                <Input
                  type="number"
                  min="0"
                  max={discount.type === "percentage" ? 100 : subtotal}
                  value={discount.value}
                  onChange={(e) =>
                    handleDiscountChange(discount.type, Number(e.target.value))
                  }
                  placeholder="0"
                />
              </FormRow>
              {showDiscountReason && (
                <Input
                  placeholder="Reason for discount (required for large discounts)"
                  value={discount.reason || ""}
                  onChange={(e) =>
                    onUpdateDiscount({ ...discount, reason: e.target.value })
                  }
                />
              )}
            </FormGrid>
          </Card>
        </Section>

        {/* Loyalty Points */}
        {clientLoyaltyPoints > 0 && (
          <Section>
            <SectionTitle>
              <Gift size={20} />
              Redeem Loyalty Points
            </SectionTitle>
            <Card>
              <LoyaltyBadge>
                <Heart size={20} style={{ color: "#C2A56F" }} />
                <span>
                  <strong>{clientLoyaltyPoints}</strong> points available ($
                  {calculateLoyaltyValue(clientLoyaltyPoints).toFixed(2)} value)
                </span>
              </LoyaltyBadge>
              <FormRow style={{ marginTop: "1rem" }}>
                <Label>Points to use:</Label>
                <Input
                  type="number"
                  min="0"
                  max={maxLoyaltyRedemption}
                  value={loyaltyPointsToRedeem}
                  onChange={(e) => {
                    const points = Math.min(
                      Number(e.target.value),
                      maxLoyaltyRedemption
                    );
                    onUpdateLoyaltyRedemption(points);
                  }}
                  placeholder="0"
                />
              </FormRow>
              {loyaltyPointsToRedeem > 0 && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    fontSize: "0.875rem",
                    color: "#34d399",
                    fontWeight: 600,
                  }}
                >
                  Saving ${loyaltyRedemptionValue.toFixed(2)}
                </div>
              )}
            </Card>
          </Section>
        )}

        {/* Tips */}
        {staffMembers.length > 0 && (
          <Section>
            <SectionTitle>
              <DollarSign size={20} />
              Add Tips
            </SectionTitle>
            <Card>
              <FormGrid>
                {staffMembers.map((staff) => (
                  <StaffTipRow key={staff.id}>
                    <Label>{staff.name}:</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.50"
                      value={tips[staff.id] || 0}
                      onChange={(e) =>
                        onUpdateTips({
                          ...tips,
                          [staff.id]: Number(e.target.value),
                        })
                      }
                      placeholder="0.00"
                      style={{ maxWidth: "120px" }}
                    />
                  </StaffTipRow>
                ))}
              </FormGrid>
            </Card>
          </Section>
        )}
      </LeftPanel>

      <RightPanel>
        <TotalSection>
          <TotalLabel>Total Amount</TotalLabel>
          <TotalAmount>${total.toFixed(2)}</TotalAmount>
          {loyaltyEarned > 0 && (
            <div
              style={{
                marginTop: "1rem",
                fontSize: "0.9375rem",
                color: "#C2A56F",
                fontWeight: 600,
              }}
            >
              +{loyaltyEarned} loyalty points earned
            </div>
          )}
        </TotalSection>

        <Breakdown>
          <BreakdownRow>
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </BreakdownRow>
          {discountAmount > 0 && (
            <BreakdownRow>
              <BreakdownLabel $positive>Discount:</BreakdownLabel>
              <BreakdownLabel $positive>
                -${discountAmount.toFixed(2)}
              </BreakdownLabel>
            </BreakdownRow>
          )}
          {loyaltyRedemptionValue > 0 && (
            <BreakdownRow>
              <BreakdownLabel $positive>Loyalty:</BreakdownLabel>
              <BreakdownLabel $positive>
                -${loyaltyRedemptionValue.toFixed(2)}
              </BreakdownLabel>
            </BreakdownRow>
          )}
          <BreakdownRow>
            <BreakdownLabel>Tax (15%):</BreakdownLabel>
            <span>${tax.toFixed(2)}</span>
          </BreakdownRow>
          {tipsTotal > 0 && (
            <BreakdownRow>
              <span>Tips:</span>
              <span>${tipsTotal.toFixed(2)}</span>
            </BreakdownRow>
          )}
          <BreakdownRow $emphasis>
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </BreakdownRow>
        </Breakdown>

        <div>
          <SectionTitle style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
            Payment Method
          </SectionTitle>
          <PaymentMethodGrid>
            {(["card", "cash", "split"] as PaymentMethod[]).map((method) => (
              <PaymentMethodButton
                key={method}
                type="button"
                $active={paymentMethod === method}
                onClick={() => setPaymentMethod(method)}
              >
                {method}
              </PaymentMethodButton>
            ))}
          </PaymentMethodGrid>

          {paymentMethod === "cash" && (
            <>
              <Input
                type="number"
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Enter cash received"
                style={{ fontSize: "1.125rem", marginTop: "1rem" }}
                autoFocus
              />
              <QuickAmountGrid>
                {SUGGESTED_AMOUNTS.map((amount) => (
                  <QuickAmountButton
                    key={amount}
                    type="button"
                    onClick={() => setCashAmount(amount.toString())}
                  >
                    ${amount}
                  </QuickAmountButton>
                ))}
              </QuickAmountGrid>
              {cashAmount && parseFloat(cashAmount) >= total && (
                <ChangeDisplay>
                  <ChangeLabel>Change Due</ChangeLabel>
                  <ChangeAmount>${change.toFixed(2)}</ChangeAmount>
                </ChangeDisplay>
              )}
            </>
          )}
        </div>

        <Actions>
          <Button
            variation="primary"
            icon={<Check size={20} />}
            onClick={handleComplete}
            disabled={!canComplete || processing}
            style={{
              width: "100%",
              padding: "1.25rem",
              fontSize: "1.125rem",
              justifyContent: "center",
            }}
          >
            {processing ? "Processing..." : "Complete Payment"}
          </Button>
          <ButtonRow>
            <Button
              variation="secondary"
              icon={<ArrowLeft size={18} />}
              onClick={onBack}
              disabled={processing}
              style={{ justifyContent: "center" }}
            >
              Back
            </Button>
            <Button
              variation="secondary"
              icon={<Edit2 size={18} />}
              onClick={onEditCart}
              disabled={processing}
              style={{ justifyContent: "center" }}
            >
              Edit Cart
            </Button>
          </ButtonRow>
        </Actions>
      </RightPanel>
    </Container>
  );
}
