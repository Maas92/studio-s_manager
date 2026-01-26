import React, { useState } from "react";
import styled from "styled-components";
import { CreditCard, DollarSign } from "lucide-react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import { Label } from "../../ui/components/Form";

interface PrepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  currentBalance: number;
  onConfirm: (amount: number, paymentMethod: "cash" | "card") => void;
}

const Container = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const CurrentBalance = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.blue100};
  border: 1px solid ${({ theme }) => theme.color.blue500};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.text};
  text-align: center;
`;

const PaymentMethodGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const PaymentMethodButton = styled.button<{ $selected?: boolean }>`
  padding: 1rem;
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.color.brand600 : theme.color.border};
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.brand50 : theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;

  button {
    flex: 1;
  }
`;

export default function PrepaymentModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  currentBalance,
  onConfirm,
}: PrepaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");

  const handleConfirm = () => {
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) {
      onConfirm(parsedAmount, paymentMethod);
      setAmount("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Prepayment - ${clientName}`}
      size="md"
    >
      <Container>
        <CurrentBalance>
          <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>
            Current Credit Balance
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: "700" }}>
            ${currentBalance.toFixed(2)}
          </div>
        </CurrentBalance>

        <div>
          <Label>Prepayment Amount</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            style={{ fontSize: "1.25rem", textAlign: "center" }}
          />
        </div>

        <div>
          <Label>Payment Method</Label>
          <PaymentMethodGroup>
            <PaymentMethodButton
              $selected={paymentMethod === "cash"}
              onClick={() => setPaymentMethod("cash")}
            >
              <DollarSign size={24} />
              <span>Cash</span>
            </PaymentMethodButton>
            <PaymentMethodButton
              $selected={paymentMethod === "card"}
              onClick={() => setPaymentMethod("card")}
            >
              <CreditCard size={24} />
              <span>Card</span>
            </PaymentMethodButton>
          </PaymentMethodGroup>
        </div>

        {amount && parseFloat(amount) > 0 && (
          <CurrentBalance
            style={{ background: "#dcfce7", borderColor: "#22c55e" }}
          >
            <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>
              New Balance After Prepayment
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: "700" }}>
              ${(currentBalance + parseFloat(amount)).toFixed(2)}
            </div>
          </CurrentBalance>
        )}

        <Actions>
          <Button variation="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variation="primary"
            onClick={handleConfirm}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Add ${amount || "0.00"} Credit
          </Button>
        </Actions>
      </Container>
    </Modal>
  );
}
