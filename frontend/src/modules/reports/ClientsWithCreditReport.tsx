import React from "react";
import styled from "styled-components";
import { Wallet, Download, TrendingUp } from "lucide-react";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import { useQuery } from "@tanstack/react-query";
import { creditClient } from "../../services/creditClient";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(Card)`
  padding: 1.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
`;

const ClientGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const ClientRow = styled(Card)`
  padding: 1.25rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ClientInfo = styled.div`
  h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.color.mutedText};
  }
`;

const CreditAmount = styled.div<{ $highlight?: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $highlight, theme }) =>
    $highlight ? theme.color.green700 : theme.color.text};
`;

const Label = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export default function ClientsWithCreditReport() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["credits", "clients-with-balance"],
    queryFn: () =>
      creditClient.getClientsWithCredit().then((res) => res.data.data.clients),
  });

  const totalCredits = clients.reduce((sum, c) => sum + c.creditBalance, 0);
  const totalLifetime = clients.reduce((sum, c) => sum + c.lifetimeCredits, 0);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <Header>
        <Title>
          <Wallet />
          Clients with Credit
        </Title>
        <Button variation="secondary">
          <Download size={16} />
          Export
        </Button>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatLabel>Total Clients with Credit</StatLabel>
          <StatValue>{clients.length}</StatValue>
        </StatCard>

        <StatCard>
          <StatLabel>Total Outstanding Credits</StatLabel>
          <StatValue>${totalCredits.toFixed(2)}</StatValue>
        </StatCard>

        <StatCard>
          <StatLabel>Lifetime Credits Added</StatLabel>
          <StatValue>${totalLifetime.toFixed(2)}</StatValue>
        </StatCard>
      </StatsGrid>

      <ClientGrid>
        {clients.map((client) => (
          <ClientRow key={client.id}>
            <ClientInfo>
              <h3>{client.name}</h3>
              <p>{client.phone || client.email}</p>
              {client.lastVisit && (
                <p>
                  Last visit: {new Date(client.lastVisit).toLocaleDateString()}
                </p>
              )}
            </ClientInfo>

            <div>
              <Label>Current Balance</Label>
              <CreditAmount $highlight>
                ${client.creditBalance.toFixed(2)}
              </CreditAmount>
            </div>

            <div>
              <Label>Lifetime Added</Label>
              <CreditAmount>${client.lifetimeCredits.toFixed(2)}</CreditAmount>
            </div>

            <div>
              <Label>Lifetime Redeemed</Label>
              <CreditAmount>${client.lifetimeRedeemed.toFixed(2)}</CreditAmount>
            </div>
          </ClientRow>
        ))}
      </ClientGrid>

      {clients.length === 0 && (
        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <Wallet size={48} style={{ opacity: 0.3, margin: "0 auto 1rem" }} />
          <h3>No clients with credit balance</h3>
          <p style={{ color: "#6b7280" }}>
            Credits will appear here when clients keep change or make
            prepayments
          </p>
        </Card>
      )}
    </Container>
  );
}
