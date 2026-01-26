import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { DollarSign, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import { Label } from "../../ui/components/Form";

interface CreditChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  changeAmount: number;
  currentBalance: number;
  onConfirm: (action: "cash" | "credit") => void;
}

const Container = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const InfoSection = styled.div`
  padding: 1.25rem;
  background: ${({ theme }) => theme.color.grey50};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;

  &:last-child {
    margin-bottom: 0;
    padding-top: 0.75rem;
    border-top: 2px solid ${({ theme }) => theme.color.border};
    font-weight: 700;
    font-size: 1.1rem;
  }
`;

const InfoLabel = styled.div`
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.95rem;
`;

const InfoValue = styled.div`
  color: ${({ theme }) => theme.color.text};
  font-weight: 600;
  font-size: 1.05rem;
`;

const OptionCard = styled.button<{ $selected?: boolean }>`
  padding: 1.5rem;
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.color.brand600 : theme.color.border};
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.brand50 : theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  display: grid;
  gap: 0.5rem;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand600};
    background: ${({ theme }) => theme.color.brand50};
  }
`;

const OptionTitle = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OptionDescription = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const BalanceHighlight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.green100};
  border: 1px solid ${({ theme }) => theme.color.green200};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.green700};
  margin-top: 0.5rem;

  svg {
    flex-shrink: 0;
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

export default function CreditChangeModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  changeAmount,
  currentBalance,
  onConfirm,
}: CreditChangeModalProps) {
  const [selectedOption, setSelectedOption] = useState<"cash" | "credit">(
    "cash",
  );

  const newBalance = currentBalance + changeAmount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Due" size="md">
      <Container>
        <InfoSection>
          <InfoRow>
            <InfoLabel>Client:</InfoLabel>
            <InfoValue>{clientName}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Change Due:</InfoLabel>
            <InfoValue>${changeAmount.toFixed(2)}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Current Credit Balance:</InfoLabel>
            <InfoValue>${currentBalance.toFixed(2)}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>New Balance (if credited):</InfoLabel>
            <InfoValue>${newBalance.toFixed(2)}</InfoValue>
          </InfoRow>
        </InfoSection>

        <div>
          <Label>How would you like to handle the change?</Label>

          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <OptionCard
              $selected={selectedOption === "cash"}
              onClick={() => setSelectedOption("cash")}
            >
              <OptionTitle>
                <DollarSign size={20} />
                Give Cash Change
              </OptionTitle>
              <OptionDescription>
                Return ${changeAmount.toFixed(2)} in cash to the client
              </OptionDescription>
            </OptionCard>

            <OptionCard
              $selected={selectedOption === "credit"}
              onClick={() => setSelectedOption("credit")}
            >
              <OptionTitle>
                <TrendingUp size={20} />
                Add to Credit Balance
              </OptionTitle>
              <OptionDescription>
                Keep change as credit for future treatments
              </OptionDescription>
              {selectedOption === "credit" && (
                <BalanceHighlight>
                  <CheckCircle size={20} />
                  <div>
                    Client's new credit balance will be{" "}
                    <strong>${newBalance.toFixed(2)}</strong>
                  </div>
                </BalanceHighlight>
              )}
            </OptionCard>
          </div>
        </div>

        <Actions>
          <Button variation="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variation="primary"
            onClick={() => {
              onConfirm(selectedOption);
              onClose();
            }}
          >
            Confirm{" "}
            {selectedOption === "cash" ? "Cash Payment" : "Credit Addition"}
          </Button>
        </Actions>
      </Container>
    </Modal>
  );
}
