import React, { useState, useMemo, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import { CreditCard, Check, AlertCircle, X } from "lucide-react";
import type { CartItem } from "./api";

type PaymentMethod = "cash" | "card" | "split";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onComplete: (paymentMethod: PaymentMethod, cashReceived?: number) => void;
  processing?: boolean;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const TotalDisplay = styled.div`
  background: ${({ theme }) => theme.color.brand50};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 1.5rem;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.color.brand200};
`;

const TotalLabel = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const TotalAmount = styled.div`
  font-size: 3rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.brand600};
  line-height: 1;
`;

const Section = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.5rem;
`;

const PaymentMethodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;

const PaymentMethodButton = styled.button<{ $active: boolean }>`
  padding: 1rem;
  background: ${({ $active, theme }) =>
    $active ? theme.color.brand500 : theme.color.grey100};
  color: ${({ $active, theme }) => ($active ? "#ffffff" : theme.color.text)};
  border: 2px solid
    ${({ $active, theme }) =>
      $active ? theme.color.brand600 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: capitalize;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand500};
  }
`;

const QuickAmountGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
`;

const QuickAmountButton = styled.button`
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.grey100};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.color.grey200};
    border-color: ${({ theme }) => theme.color.brand500};
  }
`;

const ChangeDisplay = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.green500}20;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.green500}40;
`;

const ChangeLabel = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.25rem;
`;

const ChangeAmount = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.green500};
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.red500};
  margin-top: 0.75rem;
`;

const SUGGESTED_AMOUNTS = [50, 80, 100, 110, 150];

export default function CheckoutModal({
  isOpen,
  onClose,
  total,
  onComplete,
  processing = false,
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [cashAmount, setCashAmount] = useState("");

  const change = useMemo(() => {
    const cash = parseFloat(cashAmount) || 0;
    return Math.max(0, cash - total);
  }, [cashAmount, total]);

  const isInsufficientCash = useMemo(() => {
    if (paymentMethod !== "cash") return false;
    const cash = parseFloat(cashAmount) || 0;
    return cash > 0 && cash < total;
  }, [paymentMethod, cashAmount, total]);

  const canComplete = useMemo(() => {
    if (paymentMethod === "cash") {
      const cash = parseFloat(cashAmount) || 0;
      return cash >= total;
    }
    return true;
  }, [paymentMethod, cashAmount, total]);

  const handleComplete = useCallback(() => {
    if (!canComplete || processing) return;

    const cashReceived =
      paymentMethod === "cash" ? parseFloat(cashAmount) : undefined;
    onComplete(paymentMethod, cashReceived);
  }, [canComplete, processing, paymentMethod, cashAmount, total, onComplete]);

  const handleQuickAmount = useCallback((amount: number) => {
    setCashAmount(amount.toString());
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Checkout"
      size="md"
      ariaLabel="Checkout payment"
    >
      <Content>
        {/* Total Display */}
        <TotalDisplay>
          <TotalLabel>Total Amount</TotalLabel>
          <TotalAmount>${total.toFixed(2)}</TotalAmount>
        </TotalDisplay>

        {/* Payment Method Selection */}
        <Section>
          <Label>Payment Method</Label>
          <PaymentMethodGrid>
            <PaymentMethodButton
              type="button"
              $active={paymentMethod === "card"}
              onClick={() => setPaymentMethod("card")}
            >
              Card
            </PaymentMethodButton>
            <PaymentMethodButton
              type="button"
              $active={paymentMethod === "cash"}
              onClick={() => setPaymentMethod("cash")}
            >
              Cash
            </PaymentMethodButton>
            <PaymentMethodButton
              type="button"
              $active={paymentMethod === "split"}
              onClick={() => setPaymentMethod("split")}
            >
              Split
            </PaymentMethodButton>
          </PaymentMethodGrid>
        </Section>

        {/* Cash Payment Fields */}
        {paymentMethod === "cash" && (
          <Section>
            <Label htmlFor="cash-received">Cash Received</Label>
            <Input
              id="cash-received"
              type="number"
              step="0.01"
              min="0"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="0.00"
              style={{ fontSize: "1.125rem" }}
              autoFocus
            />

            {/* Quick Amount Buttons */}
            <QuickAmountGrid>
              {SUGGESTED_AMOUNTS.map((amount) => (
                <QuickAmountButton
                  key={amount}
                  type="button"
                  onClick={() => handleQuickAmount(amount)}
                >
                  ${amount}
                </QuickAmountButton>
              ))}
            </QuickAmountGrid>

            {/* Change Display */}
            {cashAmount && parseFloat(cashAmount) >= total && (
              <ChangeDisplay>
                <ChangeLabel>Change Due</ChangeLabel>
                <ChangeAmount>${change.toFixed(2)}</ChangeAmount>
              </ChangeDisplay>
            )}
          </Section>
        )}

        {/* Complete Payment Button */}
        <Button
          type="button"
          onClick={handleComplete}
          disabled={!canComplete || processing}
          variation="primary"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1rem",
            justifyContent: "center",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {processing ? (
            "Processing..."
          ) : (
            <>
              <Check size={20} />
              Complete Payment
            </>
          )}
        </Button>

        {/* Error Message */}
        {isInsufficientCash && (
          <ErrorMessage>
            <AlertCircle size={16} />
            Insufficient cash amount
          </ErrorMessage>
        )}
      </Content>
    </Modal>
  );
}
