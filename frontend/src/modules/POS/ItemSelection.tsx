import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { Plus, Minus, Trash2, Package, Clock } from "lucide-react";

import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import EmptyState from "../../ui/components/EmptyState";

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Left = styled.div`
  display: grid;
  gap: 1rem;
`;
const Right = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  position: sticky;
  top: 1rem;
  height: fit-content;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
`;
const Tab = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: transparent;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.color.brand500 : "transparent")};
  cursor: pointer;
`;
const Grid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, 1fr);
`;

const ItemButton = styled.button<{ $disabled?: boolean; $inCart?: boolean }>`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  text-align: left;
  border: 1px solid
    ${({ theme, $inCart }) =>
      $inCart ? theme.color.green500 : theme.color.border};
  background: ${({ theme, $inCart }) =>
    $inCart ? theme.color.green500 + "12" : theme.color.panel};
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default function ItemSelection({
  clientType,
  clientName,
  appointments,
  treatments,
  stockItems,
  cart,
  productStock,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onUpdateNotes,
  onNext,
  onBack,
}: {
  clientType: "booked" | "walk-in";
  clientName?: string;
  appointments: any[];
  treatments: any[];
  stockItems: any[]; // <-- replaced 'products' with 'stockItems'
  cart: any[];
  productStock: Record<string, number>;
  onAddToCart: (item: any) => void;
  onUpdateQuantity: (id: string, type: string, delta: number) => void;
  onRemoveFromCart: (id: string, type: string) => void;
  onUpdateNotes: (id: string, type: string, notes: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [active, setActive] = useState<
    "appointments" | "treatments" | "products"
  >(clientType === "booked" ? "appointments" : "treatments");
  const [q, setQ] = useState("");

  const filteredAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          (a.clientName || "").toLowerCase().includes(q.toLowerCase()) ||
          (a.treatmentName || "").toLowerCase().includes(q.toLowerCase())
      ),
    [appointments, q]
  );
  const filteredTreatments = useMemo(
    () =>
      treatments.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (t.category || "" || "").toLowerCase().includes(q.toLowerCase())
      ),
    [treatments, q]
  );
  const filteredStock = useMemo(
    () =>
      stockItems.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (p.category || "" || "").toLowerCase().includes(q.toLowerCase())
      ),
    [stockItems, q]
  );

  const isInCart = (id: string, type: string) =>
    cart.some((i) => i.id === id && i.type === type);

  const productStatus = (id: string) => {
    const stock = productStock[id] ?? 0;
    const inCartQty = cart
      .filter((i) => (i.productId ?? i.id) === id && i.type === "product")
      .reduce((s, i) => s + i.quantity, 0);
    const available = Math.max(0, stock - inCartQty);
    return {
      available,
      status: available <= 0 ? "out" : available <= 5 ? "low" : "ok",
    };
  };

  return (
    <Container>
      <Left>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Add items to cart</h2>
            {clientName && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Client: {clientName}
              </div>
            )}
          </div>
        </div>

        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search items..."
        />

        <Tabs>
          {clientType === "booked" && (
            <Tab
              $active={active === "appointments"}
              onClick={() => setActive("appointments")}
            >
              Appointments
            </Tab>
          )}
          <Tab
            $active={active === "treatments"}
            onClick={() => setActive("treatments")}
          >
            Treatments
          </Tab>
          <Tab
            $active={active === "products"}
            onClick={() => setActive("products")}
          >
            Products
          </Tab>
        </Tabs>

        <div style={{ maxHeight: 520, overflow: "auto" }}>
          {active === "appointments" && (
            <Grid>
              {filteredAppointments.map((apt) => (
                <ItemButton
                  key={apt.id}
                  $inCart={isInCart(apt.id, "appointment")}
                  disabled={isInCart(apt.id, "appointment")}
                  onClick={() =>
                    onAddToCart({
                      ...apt,
                      type: "appointment",
                      name: apt.treatmentName,
                      price: apt.price,
                      quantity: 1,
                    })
                  }
                >
                  <div style={{ fontWeight: 700 }}>{apt.treatmentName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {apt.clientName} • {apt.time}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <div>${(apt.price || 0).toFixed(2)}</div>
                    {isInCart(apt.id, "appointment") ? (
                      <div style={{ color: "var(--green500)" }}>In cart</div>
                    ) : (
                      <Plus />
                    )}
                  </div>
                </ItemButton>
              ))}
            </Grid>
          )}

          {active === "treatments" && (
            <Grid>
              {filteredTreatments.map((t) => (
                <ItemButton
                  key={t.id}
                  onClick={() =>
                    onAddToCart({
                      ...t,
                      type: "treatment",
                      name: t.name,
                      price: t.price,
                      quantity: 1,
                    })
                  }
                >
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {t.durationMinutes ?? t.duration} min • {t.category}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <div>${(t.price || 0).toFixed(2)}</div>
                    <Plus />
                  </div>
                </ItemButton>
              ))}
            </Grid>
          )}

          {active === "products" && (
            <Grid>
              {filteredStock.map((p) => {
                const key = p.productId ?? p.id;
                const status = productStatus(key);
                const canAdd = status.available > 0;
                return (
                  <ItemButton
                    key={p.id}
                    $disabled={!canAdd}
                    disabled={!canAdd}
                    onClick={() =>
                      canAdd &&
                      onAddToCart({
                        ...p,
                        type: "product",
                        name: p.name,
                        price: p.price,
                        productId: key,
                        stockId: p.id,
                        quantity: 1,
                      })
                    }
                  >
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {p.category}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 8,
                      }}
                    >
                      <div>${(p.price || 0).toFixed(2)}</div>
                      {!canAdd ? (
                        <div style={{ color: "var(--red500)" }}>Out</div>
                      ) : (
                        <div>{status.available} in stock</div>
                      )}
                    </div>
                  </ItemButton>
                );
              })}
            </Grid>
          )}
        </div>
      </Left>

      <Right>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>Cart</h3>
          <div style={{ fontWeight: 700 }}>{cart.length} items</div>
        </div>

        <div style={{ marginTop: 12 }}>
          {cart.length === 0 ? (
            <EmptyState title="Cart is empty" />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {cart.map((item: any, idx: number) => (
                <Card
                  key={`${item.id}-${item.type}-${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {item.staffName ?? item.clientName ?? ""}
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    {item.type === "product" ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.id, item.type, -1)
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <div
                          style={{
                            minWidth: 32,
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          {item.quantity}
                        </div>
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.id, item.type, 1)
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13 }}>Qty: {item.quantity}</div>
                    )}

                    <div style={{ fontWeight: 800 }}>
                      ${((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}
                    </div>
                    <button
                      onClick={() => onRemoveFromCart(item.id, item.type)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--red500)",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Button variation="secondary" onClick={onBack}>
            Back
          </Button>
          <Button
            variation="primary"
            onClick={onNext}
            disabled={cart.length === 0}
          >
            Next
          </Button>
        </div>
      </Right>
    </Container>
  );
}
