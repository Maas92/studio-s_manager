import React, { useMemo, useState } from "react";
import styled from "styled-components";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import { Check, ArrowLeft, Edit2 } from "lucide-react";

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
const Right = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  padding: 1.25rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  position: sticky;
  top: 1rem;
  height: fit-content;
`;
const Card = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.grey100};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

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
}: any) {
  const subtotal = useMemo(
    () => cart.reduce((s: any, i: any) => s + i.price * i.quantity, 0),
    [cart]
  );
  const discountAmount =
    discount?.type === "percentage"
      ? (subtotal * (discount.value || 0)) / 100
      : discount.value || 0;
  const loyaltyValue = (loyaltyPointsToRedeem || 0) * 0.01; // example conversion
  const afterDiscount = Math.max(
    0,
    subtotal - (discountAmount || 0) - loyaltyValue
  );
  const tax = afterDiscount * 0.15;
  const tipsTotal = Object.values(tips || {}).reduce(
    (s: any, v: any) => s + v,
    0
  );
  const total = afterDiscount + tax + tipsTotal;

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "split">(
    "card"
  );
  const [cashAmount, setCashAmount] = useState("");

  const change = useMemo(
    () => Math.max(0, (parseFloat(cashAmount || "0") || 0) - total),
    [cashAmount, total]
  );
  const canComplete =
    paymentMethod === "cash"
      ? (parseFloat(cashAmount || "0") || 0) >= total
      : true;

  return (
    <Container>
      <div>
        <h2 style={{ margin: 0 }}>Payment</h2>
        <p style={{ color: "var(--muted)" }}>
          Client: {clientName ?? "Walk-in"}
        </p>

        <div style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 8 }}>Order</h3>
          <Card>
            {cart.map((it: any) => (
              <div
                key={`${it.id}-${it.type}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.5rem 0",
                  borderBottom: "1px dashed var(--border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{it.name}</div>
                  {it.staffName && (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {it.staffName}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800 }}>
                    ${(it.price * it.quantity).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    Qty: {it.quantity}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Right>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--muted)",
              }}
            >
              Total
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--brand600)",
              }}
            >
              ${total.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Payment Method
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
              }}
            >
              {(["card", "cash", "split"] as any).map((m: any) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    border:
                      paymentMethod === m
                        ? "2px solid var(--brand600)"
                        : "1px solid var(--border)",
                    background:
                      paymentMethod === m ? "var(--brand500)" : "var(--panel)",
                    color: paymentMethod === m ? "#fff" : "inherit",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {paymentMethod === "cash" && (
              <>
                <Input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Cash received"
                  style={{ marginTop: 8 }}
                />
                {parseFloat(cashAmount || "0") >= total && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      background: "rgba(16,185,129,0.06)",
                      borderRadius: 6,
                    }}
                  >
                    <strong>Change:</strong> ${change.toFixed(2)}
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Button
              variation="primary"
              onClick={() =>
                onComplete([{ method: paymentMethod, amount: total }])
              }
              disabled={!canComplete || processing}
            >
              <Check size={18} style={{ marginRight: 8 }} />
              {processing ? "Processing..." : "Complete Payment"}
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variation="secondary" onClick={onBack}>
                <ArrowLeft size={18} style={{ marginRight: 8 }} />
                Back
              </Button>
              <Button variation="secondary" onClick={onEditCart}>
                <Edit2 size={18} style={{ marginRight: 8 }} />
                Edit Cart
              </Button>
            </div>
          </div>
        </div>
      </Right>
    </Container>
  );
}
