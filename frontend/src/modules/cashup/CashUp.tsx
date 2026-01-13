import React, { useState, useMemo, useEffect } from "react";
import styled from "styled-components";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Receipt,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Save,
  Calendar,
  Clock,
  Edit2,
  Package,
} from "lucide-react";
import { useCashUp } from "./useCashUp";

import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import { Label } from "../../ui/components/Form";

// ============================================================================
// TYPES
// ============================================================================

interface Transaction {
  id: string;
  total: number;
  payments: PaymentBreakdown[];
  createdAt: string;
  clientName?: string;
}

interface PaymentBreakdown {
  method: "cash" | "card" | "loyalty" | "gift-card";
  amount: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  time: string;
}

interface CashUpData {
  expectedCash: number;
  actualCash: number;
  variance: number;
  cardTotal: number;
  otherPayments: number;
  expenses: Expense[];
  openingFloat: number;
}

interface CashUpProps {
  transactions?: Transaction[];
  openingFloat?: number;
  onComplete?: (data: CashUpData) => void;
  onSave?: (data: CashUpData) => void;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
`;

const DateInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.95rem;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(Card)<{
  $variant?: "success" | "warning" | "error" | "info";
}>`
  padding: 1.5rem;
  background: ${({ theme, $variant }) => {
    if ($variant === "success") return theme.color.green100;
    if ($variant === "warning") return theme.color.yellow100;
    if ($variant === "error") return theme.color.red100;
    if ($variant === "info") return theme.color.blue100;
    return theme.color.panel;
  }};
  border: 1px solid
    ${({ theme, $variant }) => {
      if ($variant === "success") return theme.color.green200;
      if ($variant === "warning") return theme.color.yellow200;
      if ($variant === "error") return theme.color.red200;
      if ($variant === "info") return theme.color.blue100;
      return theme.color.border;
    }};
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled(Card)`
  padding: 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${({ theme }) => theme.color.border};
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ExpenseList = styled.div`
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.color.grey100};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.grey400};
    border-radius: 3px;
  }
`;

const ExpenseItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${({ theme }) => theme.color.grey50};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  gap: 1rem;
`;

const ExpenseInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ExpenseDescription = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;
`;

const ExpenseMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const ExpenseAmount = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.color.red600};
  white-space: nowrap;
`;

const ExpenseForm = styled.div`
  display: grid;
  gap: 1rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.grey50};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const PaymentBreakdownSection = styled.div`
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const PaymentRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.color.grey50};
  border-radius: ${({ theme }) => theme.radii.sm};
`;

const PaymentLabel = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const PaymentAmount = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.color.brand600};
`;

const CashInputSection = styled.div`
  display: grid;
  gap: 1rem;
`;

const InputGroup = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const VarianceAlert = styled.div<{ $variant: "success" | "warning" | "error" }>`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme, $variant }) => {
    if ($variant === "success") return theme.color.green100;
    if ($variant === "warning") return theme.color.yellow100;
    return theme.color.red100;
  }};
  border: 1px solid
    ${({ theme, $variant }) => {
      if ($variant === "success") return theme.color.green500;
      if ($variant === "warning") return theme.color.yellow700;
      return theme.color.red500;
    }};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme, $variant }) => {
    if ($variant === "success") return theme.color.green700;
    if ($variant === "warning") return theme.color.yellow700;
    return theme.color.red600;
  }};
  margin-top: 1rem;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const VarianceContent = styled.div`
  flex: 1;

  strong {
    font-weight: 700;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid ${({ theme }) => theme.color.border};

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const DeleteButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.red100};
  border: 1px solid ${({ theme }) => theme.color.red200};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: all 0.2s;
  color: ${({ theme }) => theme.color.red600};

  &:hover {
    background: ${({ theme }) => theme.color.red500};
    color: white;
    border-color: ${({ theme }) => theme.color.red600};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const CalculationBreakdown = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.grey50};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const BreakdownTitle = styled.div`
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: ${({ theme }) => theme.color.text};
`;

const BreakdownGrid = styled.div`
  display: grid;
  gap: 0.5rem;
  font-size: 0.875rem;
`;

const BreakdownRow = styled.div<{ $color?: string }>`
  display: flex;
  justify-content: space-between;
  color: ${({ $color }) => $color};
`;

const BreakdownValue = styled.span`
  font-weight: 600;
`;

const TotalRow = styled(BreakdownRow)`
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  color: ${({ theme }) => theme.color.text};
`;

// ============================================================================
// COMPONENT
// ============================================================================

export default function CashUp({
  cashUpId, // Pass the cash-up session ID
  onComplete,
  onSave,
}: {
  cashUpId?: string;
  onComplete?: (data: any) => void;
  onSave?: (data: any) => void;
}) {
  const {
    getQuery,
    dailySnapshotQuery,
    createMutation,
    completeMutation,
    addExpenseMutation,
    deleteExpenseMutation,
    uploadReceiptMutation,
    addSafeDropMutation,
    deleteSafeDropMutation,
  } = useCashUp();

  // Load existing session or daily snapshot
  const { data: cashUpData } = cashUpId
    ? getQuery(cashUpId)
    : dailySnapshotQuery;

  const [sessionId, setSessionId] = useState<string | null>(cashUpId || null);

  // Initialize from backend data
  useEffect(() => {
    if (cashUpData) {
      setSessionId(cashUpData.id);
      setOpeningFloatInput(cashUpData.openingFloat.toString());
      setExpenses(cashUpData.expenses || []);
      // ... set other state from backend
    }
  }, [cashUpData]);

  // Updated handlers to call backend:

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !sessionId) return;

    try {
      await addExpenseMutation.mutateAsync({
        cashUpId: sessionId,
        data: {
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
        },
      });

      setNewExpense({ description: "", amount: "", category: "general" });
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const handleRemoveExpense = async (id: string) => {
    if (!sessionId) return;

    try {
      await deleteExpenseMutation.mutateAsync({
        cashUpId: sessionId,
        expenseId: id,
      });
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const handleComplete = async () => {
    if (!sessionId) return;

    try {
      const result = await completeMutation.mutateAsync({
        id: sessionId,
        data: {
          actualCash: parseFloat(actualCash),
          notes: calculations.variance !== 0 ? "Variance detected" : undefined,
        },
      });

      onComplete?.(result.data.data.cashUp);
    } catch (error) {
      console.error("Failed to complete cash-up:", error);
    }
  };

  // Save draft
  const handleSave = () => {
    const data: CashUpData = {
      expectedCash: calculations.expectedCash,
      actualCash: calculations.actualCash,
      variance: calculations.variance,
      cardTotal: paymentTotals.card,
      otherPayments: paymentTotals.loyalty + paymentTotals.giftCard,
      expenses,
      openingFloat: calculations.openingFloat,
    };

    onSave?.(data);
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Container>
      <Header>
        <Title>Cash-Up</Title>
        <DateInfo>
          <Calendar />
          <span>{currentDate}</span>
          <Clock />
          <span>{currentTime}</span>
        </DateInfo>
      </Header>

      {/* Summary Cards */}
      <Grid>
        <StatCard>
          <StatLabel>
            <Receipt />
            Total Sales
          </StatLabel>
          <StatValue>${calculations.totalSales.toFixed(2)}</StatValue>
        </StatCard>

        <StatCard $variant="info">
          <StatLabel>
            <Banknote />
            Expected Cash
          </StatLabel>
          <StatValue>${calculations.expectedCash.toFixed(2)}</StatValue>
        </StatCard>

        <StatCard $variant={getVarianceStatus()}>
          <StatLabel>
            {calculations.variance >= 0 ? <TrendingUp /> : <TrendingDown />}
            Variance
          </StatLabel>
          <StatValue>
            {calculations.variance >= 0 ? "+" : ""}$
            {calculations.variance.toFixed(2)}
          </StatValue>
        </StatCard>
      </Grid>

      {/* Main Content */}
      <TwoColumnGrid>
        {/* Left Column - Sales Breakdown */}
        <Section>
          <SectionHeader>
            <SectionTitle>
              <Receipt />
              Sales Breakdown
            </SectionTitle>
          </SectionHeader>

          {/* Opening Float */}
          <PaymentBreakdownSection>
            <PaymentRow>
              <PaymentLabel>
                <DollarSign />
                Opening Float
                {!editingFloat && (
                  <Edit2
                    size={14}
                    style={{ cursor: "pointer", opacity: 0.6 }}
                    onClick={() => setEditingFloat(true)}
                  />
                )}
              </PaymentLabel>
              {editingFloat ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Input
                    type="number"
                    step="0.01"
                    value={openingFloatInput}
                    onChange={(e) => setOpeningFloatInput(e.target.value)}
                    style={{ width: "120px" }}
                  />
                  <Button
                    size="small"
                    variation="primary"
                    onClick={() => setEditingFloat(false)}
                  >
                    <Save size={14} />
                  </Button>
                </div>
              ) : (
                <PaymentAmount>
                  ${calculations.openingFloat.toFixed(2)}
                </PaymentAmount>
              )}
            </PaymentRow>
          </PaymentBreakdownSection>

          <PaymentBreakdownSection>
            <PaymentRow>
              <PaymentLabel>
                <Banknote />
                Cash Sales
              </PaymentLabel>
              <PaymentAmount>${paymentTotals.cash.toFixed(2)}</PaymentAmount>
            </PaymentRow>

            <PaymentRow>
              <PaymentLabel>
                <CreditCard />
                Card Payments
              </PaymentLabel>
              <PaymentAmount>${paymentTotals.card.toFixed(2)}</PaymentAmount>
            </PaymentRow>

            {(paymentTotals.loyalty > 0 || paymentTotals.giftCard > 0) && (
              <PaymentRow>
                <PaymentLabel>
                  <DollarSign />
                  Other Payments
                </PaymentLabel>
                <PaymentAmount>
                  ${(paymentTotals.loyalty + paymentTotals.giftCard).toFixed(2)}
                </PaymentAmount>
              </PaymentRow>
            )}
          </PaymentBreakdownSection>

          {/* Expenses */}
          <div style={{ marginTop: "1.5rem" }}>
            <SectionTitle style={{ marginBottom: "1rem" }}>
              <TrendingDown />
              Expenses
            </SectionTitle>

            <ExpenseForm>
              <FormRow>
                <Input
                  placeholder="Description (e.g., Office supplies)"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      description: e.target.value,
                    })
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                />
                <Button
                  variation="primary"
                  onClick={handleAddExpense}
                  disabled={!newExpense.description || !newExpense.amount}
                >
                  <Plus size={16} />
                  Add
                </Button>
              </FormRow>
            </ExpenseForm>

            {expenses.length > 0 ? (
              <ExpenseList>
                {expenses.map((expense) => (
                  <ExpenseItem key={expense.id}>
                    <ExpenseInfo>
                      <ExpenseDescription>
                        {expense.description}
                      </ExpenseDescription>
                      <ExpenseMeta>{expense.time}</ExpenseMeta>
                    </ExpenseInfo>
                    <ExpenseAmount>-${expense.amount.toFixed(2)}</ExpenseAmount>
                    <DeleteButton
                      onClick={() => handleRemoveExpense(expense.id)}
                    >
                      <Trash2 />
                    </DeleteButton>
                  </ExpenseItem>
                ))}
                <PaymentRow>
                  <PaymentLabel>
                    <strong>Total Expenses</strong>
                  </PaymentLabel>
                  <PaymentAmount style={{ color: "#dc2626" }}>
                    -${calculations.totalExpenses.toFixed(2)}
                  </PaymentAmount>
                </PaymentRow>
              </ExpenseList>
            ) : (
              <EmptyState style={{ padding: "2rem 1rem" }}>
                <Package size={32} style={{ opacity: 0.3 }} />
                <div style={{ marginTop: "0.5rem" }}>No expenses recorded</div>
              </EmptyState>
            )}
          </div>
        </Section>

        {/* Right Column - Cash Count */}
        <Section>
          <SectionHeader>
            <SectionTitle>
              <Banknote />
              Cash Count
            </SectionTitle>
          </SectionHeader>

          <CashInputSection>
            <InputGroup>
              <Label>Expected Cash in Drawer</Label>
              <Input
                type="text"
                value={`$${calculations.expectedCash.toFixed(2)}`}
                disabled
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  textAlign: "center",
                }}
              />
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  textAlign: "center",
                }}
              >
                Opening float (${calculations.openingFloat.toFixed(2)}) + Cash
                sales (${paymentTotals.cash.toFixed(2)}) - Expenses ($
                {calculations.totalExpenses.toFixed(2)})
              </div>
            </InputGroup>

            <InputGroup>
              <Label>Actual Cash in Drawer</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter counted amount"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  textAlign: "center",
                }}
              />
            </InputGroup>

            {actualCash && (
              <VarianceAlert $variant={getVarianceStatus()}>
                {getVarianceStatus() === "success" ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
                <VarianceContent>
                  <strong>
                    {calculations.variance >= 0 ? "Over" : "Short"} by $
                    {Math.abs(calculations.variance).toFixed(2)}
                  </strong>
                  <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                    {getVarianceStatus() === "success" &&
                      "Perfect! Cash balances exactly."}
                    {getVarianceStatus() === "warning" &&
                      "Minor variance detected. Please verify count."}
                    {getVarianceStatus() === "error" &&
                      "Significant variance detected. Please recount and check all transactions."}
                  </div>
                </VarianceContent>
              </VarianceAlert>
            )}

            {/* Calculation Breakdown */}
            <CalculationBreakdown>
              <BreakdownTitle>Calculation Breakdown:</BreakdownTitle>
              <BreakdownGrid>
                <BreakdownRow>
                  <span>Opening Float:</span>
                  <BreakdownValue>
                    ${calculations.openingFloat.toFixed(2)}
                  </BreakdownValue>
                </BreakdownRow>
                <BreakdownRow $color="#059669">
                  <span>+ Cash Sales:</span>
                  <BreakdownValue>
                    ${paymentTotals.cash.toFixed(2)}
                  </BreakdownValue>
                </BreakdownRow>
                <BreakdownRow $color="#dc2626">
                  <span>- Total Expenses:</span>
                  <BreakdownValue>
                    ${calculations.totalExpenses.toFixed(2)}
                  </BreakdownValue>
                </BreakdownRow>
                <TotalRow>
                  <span>Expected Cash:</span>
                  <span>${calculations.expectedCash.toFixed(2)}</span>
                </TotalRow>
              </BreakdownGrid>
            </CalculationBreakdown>
          </CashInputSection>
        </Section>
      </TwoColumnGrid>

      {/* Actions */}
      <Actions>
        <Button
          variation="secondary"
          size="large"
          onClick={handleSave}
          style={{ flex: 1 }}
        >
          <Save size={18} />
          Save Draft
        </Button>
        <Button
          variation="primary"
          size="large"
          onClick={handleComplete}
          disabled={!actualCash}
          style={{ flex: 1 }}
        >
          <CheckCircle size={18} />
          Complete Cash-Up
        </Button>
      </Actions>
    </Container>
  );
}
