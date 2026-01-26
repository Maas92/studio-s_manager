import React from "react";
import styled from "styled-components";
import { Wallet, TrendingUp, TrendingDown, Plus } from "lucide-react";
import Button from "../../ui/components/Button";
import { useClientBalance } from "../credits/useCredits";

interface ClientCreditWidgetProps {
  clientId: string;
  clientName: string;
  onAddPrepayment: () => void;
  onRedeemCredit: () => void;
}

const Widget = styled.div`
  padding: 1.25rem;
  background: ${({ theme }) => theme.color.blue100};
  border: 2px solid ${({ theme }) => theme.color.blue500};
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-bottom: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.color.text};
`;

const Balance = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.blue500};
  text-align: center;
  margin: 1rem 0;
`;

const BalanceLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  text-align: center;
  margin-bottom: 0.5rem;
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const QuickAction = styled(Button)`
  justify-content: center;
`;

export default function ClientCreditWidget({
  clientId,
  clientName,
  onAddPrepayment,
  onRedeemCredit,
}: ClientCreditWidgetProps) {
  const { data: balance = 0, isLoading } = useClientBalance(clientId);

  if (isLoading) {
    return (
      <Widget>
        <div style={{ textAlign: "center", padding: "1rem" }}>
          Loading credit balance...
        </div>
      </Widget>
    );
  }

  return (
    <Widget>
      <Header>
        <Title>
          <Wallet size={20} />
          {clientName}'s Credit
        </Title>
      </Header>

      <BalanceLabel>Available Credit Balance</BalanceLabel>
      <Balance>${balance.toFixed(2)}</Balance>

      <Actions>
        <QuickAction
          variation="secondary"
          size="medium"
          onClick={onAddPrepayment}
        >
          <Plus size={16} />
          Add Credit
        </QuickAction>
        <QuickAction
          variation="primary"
          size="medium"
          onClick={onRedeemCredit}
          disabled={balance <= 0}
        >
          <TrendingDown size={16} />
          Use Credit
        </QuickAction>
      </Actions>

      {balance > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#dcfce7",
            borderRadius: "6px",
            fontSize: "0.85rem",
            color: "#15803d",
            textAlign: "center",
          }}
        >
          💚 Client can save ${balance.toFixed(2)} on this purchase!
        </div>
      )}
    </Widget>
  );
}
