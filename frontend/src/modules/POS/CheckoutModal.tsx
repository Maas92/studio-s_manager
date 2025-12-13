import React, { useState, useMemo, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import { Check, AlertCircle } from "lucide-react";

const Content = styled.div`
  display: grid;
  gap: 1rem;
`;
const TotalDisplay = styled.div`
  background: ${({ theme }) => theme.color.brand50};
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  text-align: center;
  border: 1px solid ${({ theme }) => theme.color.brand200};
`;
const TotalAmount = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.brand600};
`;
const PaymentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;
const MethodBtn = styled.button<{ $active?: boolean }>`
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 2px solid
    ${({ $active, theme }) =>
      $active ? theme.color.brand600 : theme.color.border};
  background: ${({ $active, theme }) =>
    $active ? theme.color.brand500 : theme.color.panel};
  color: ${({ $active }) => ($active ? "#fff" : "inherit")};
  cursor: pointer;
`;

export default function CheckoutModal({
  isOpen,
  onClose,
  total,
  onComplete,
  processing = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onComplete: (payments: any[]) => void;
  processing?: boolean;
}) {
  const [method, setMethod] = useState<"card" | "cash" | "split">("card");
  const [cash, setCash] = useState("");

  const change = useMemo(
    () => Math.max(0, (parseFloat(cash || "0") || 0) - total),
    [cash, total]
  );
  const canComplete = useMemo(
    () => (method === "cash" ? (parseFloat(cash || "0") || 0) >= total : true),
    [method, cash, total]
  );
  const insufficient = useMemo(
    () =>
      method === "cash" &&
      (parseFloat(cash || "0") || 0) > 0 &&
      (parseFloat(cash || "0") || 0) < total,
    [method, cash, total]
  );

  const handleComplete = useCallback(() => {
    if (!canComplete || processing) return;
    onComplete([{ method, amount: total }]);
  }, [canComplete, processing, method, total, onComplete]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Checkout"
      size="md"
      ariaLabel="Checkout"
    >
      <Content>
        <TotalDisplay>
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Total
          </div>
          <TotalAmount>${total.toFixed(2)}</TotalAmount>
        </TotalDisplay>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Payment Method</div>
          <PaymentGrid>
            <MethodBtn
              $active={method === "card"}
              onClick={() => setMethod("card")}
            >
              Card
            </MethodBtn>
            <MethodBtn
              $active={method === "cash"}
              onClick={() => setMethod("cash")}
            >
              Cash
            </MethodBtn>
            <MethodBtn
              $active={method === "split"}
              onClick={() => setMethod("split")}
            >
              Split
            </MethodBtn>
          </PaymentGrid>

          {method === "cash" && (
            <div style={{ marginTop: 8 }}>
              <Input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="Cash received"
              />
              {parseFloat(cash || "0") >= total && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    background: "rgba(16,185,129,0.06)",
                    border: `1px solid rgba(16,185,129,0.12)`,
                    borderRadius: 6,
                  }}
                >
                  <strong>Change:</strong> ${change.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <Button
            variation="primary"
            onClick={handleComplete}
            disabled={!canComplete || processing}
          >
            <Check size={18} style={{ marginRight: 8 }} />
            {processing ? "Processing..." : "Complete Payment"}
          </Button>
          {insufficient && (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                color: "var(--red500)",
              }}
            >
              <AlertCircle /> Insufficient cash
            </div>
          )}
        </div>
      </Content>
    </Modal>
  );
}
