import React, { useState, useMemo } from "react";
import styled from "styled-components";
import {
  Plus,
  Minus,
  Trash2,
  Package,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";

// ============================================================================
// TYPES
// ============================================================================

interface ItemSelectionProps {
  clientType: "booked" | "walk-in";
  clientName?: string;
  appointments: any[];
  treatments: any[];
  stockItems: any[];
  cart: any[];
  productStock: Record<string, number>;
  onAddToCart: (item: any) => void;
  onUpdateQuantity: (id: string, type: string, delta: number) => void;
  onRemoveFromCart: (id: string, type: string) => void;
  onNext: () => void;
  onBack: () => void;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

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

const MainContent = styled.div`
  display: grid;
  gap: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
`;

const Subtitle = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  background: ${({ theme }) => theme.color.grey100};
  padding: 0.25rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const Tab = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.color.panel : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.color.text : theme.color.mutedText};
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadowSm : "none")};

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.color.panel : theme.color.grey200};
  }
`;

const ItemsGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, 1fr);
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.5rem;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.color.grey100};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.grey400};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.color.grey500};
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ItemButton = styled.button<{ $disabled?: boolean; $inCart?: boolean }>`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  text-align: left;
  border: 1px solid
    ${({ theme, $inCart }) =>
      $inCart ? theme.color.green500 : theme.color.border};
  background: ${({ theme, $inCart }) =>
    $inCart ? theme.color.green200 : theme.color.panel};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  box-shadow: ${({ theme }) => theme.shadowSm};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadowMd};
    border-color: ${({ theme, $inCart }) =>
      $inCart ? theme.color.green700 : theme.color.brand500};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const ItemName = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
`;

const ItemMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ItemFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const ItemPrice = styled.div`
  font-weight: 700;
  font-size: 1.125rem;
  color: ${({ theme }) => theme.color.brand600};
`;

const ItemStatus = styled.div<{ $variant: "success" | "warning" | "error" }>`
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${({ $variant, theme }) => {
    if ($variant === "success") return theme.color.green700;
    if ($variant === "warning") return theme.color.yellow700;
    return theme.color.red600;
  }};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const CartPanel = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadowMd};
  position: sticky;
  top: 1rem;
  height: fit-content;
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;

  @media (max-width: 1024px) {
    position: relative;
    top: 0;
    max-height: none;
  }
`;

const CartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${({ theme }) => theme.color.border};
`;

const CartTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CartCount = styled.div`
  background: ${({ theme }) => theme.color.brand500};
  color: white;
  border-radius: ${({ theme }) => theme.radii.round};
  padding: 0.25rem 0.625rem;
  font-size: 0.875rem;
  font-weight: 700;
`;

const CartItems = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
  display: grid;
  gap: 0.75rem;
  max-height: 400px;

  /* Custom scrollbar */
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

const CartItem = styled(Card)`
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
`;

const CartItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CartItemName = styled.div`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CartItemDetail = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-top: 0.25rem;
`;

const CartItemControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => theme.color.grey100};
  padding: 0.25rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const QuantityButton = styled.button`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: all 0.2s;
  color: ${({ theme }) => theme.color.text};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.brand500};
    color: white;
    border-color: ${({ theme }) => theme.color.brand600};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const QuantityDisplay = styled.div`
  min-width: 32px;
  text-align: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.text};
`;

const CartItemPrice = styled.div`
  font-weight: 800;
  font-size: 1rem;
  color: ${({ theme }) => theme.color.brand600};
  white-space: nowrap;
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

const EmptyCart = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const EmptyIcon = styled.div`
  margin: 0 auto 1rem;
  opacity: 0.3;

  svg {
    width: 48px;
    height: 48px;
  }
`;

const CartActions = styled.div`
  display: grid;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 2px solid ${({ theme }) => theme.color.border};
`;

const CartTotal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.brand50};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 0.75rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.red100};
  border: 1px solid ${({ theme }) => theme.color.red500};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.red600};
  font-size: 0.875rem;
  margin-bottom: 0.75rem;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

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
  onNext,
  onBack,
}: ItemSelectionProps) {
  const [activeTab, setActiveTab] = useState<
    "appointments" | "treatments" | "products"
  >(clientType === "booked" ? "appointments" : "treatments");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items based on search
  const filteredAppointments = useMemo(
    () =>
      appointments.filter((a) =>
        (a.clientName + " " + a.treatmentName)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ),
    [appointments, searchQuery]
  );

  const filteredTreatments = useMemo(
    () =>
      treatments.filter((t) =>
        (t.name + " " + (t.category || ""))
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ),
    [treatments, searchQuery]
  );

  const filteredStock = useMemo(
    () =>
      stockItems.filter((p) =>
        (p.name + " " + (p.category || ""))
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ),
    [stockItems, searchQuery]
  );

  // Check if item is in cart
  const isInCart = (id: string, type: string) =>
    cart.some((i) => i.id === id && i.type === type);

  // Get product status
  const getProductStatus = (productId: string) => {
    const stock = productStock[productId] ?? 0;
    const inCartQty = cart
      .filter(
        (i) => (i.productId ?? i.id) === productId && i.type === "product"
      )
      .reduce((sum, i) => sum + i.quantity, 0);
    const available = Math.max(0, stock - inCartQty);

    return {
      available,
      status: available <= 0 ? "out" : available <= 5 ? "low" : "ok",
    };
  };

  // Calculate cart total
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const canProceed = cart.length > 0;

  return (
    <Container>
      <MainContent>
        <Header>
          <div>
            <Title>Add Items to Cart</Title>
            {clientName && <Subtitle>Client: {clientName}</Subtitle>}
          </div>
        </Header>

        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
        />

        <Tabs>
          {clientType === "booked" && (
            <Tab
              $active={activeTab === "appointments"}
              onClick={() => setActiveTab("appointments")}
            >
              Appointments
            </Tab>
          )}
          <Tab
            $active={activeTab === "treatments"}
            onClick={() => setActiveTab("treatments")}
          >
            Treatments
          </Tab>
          <Tab
            $active={activeTab === "products"}
            onClick={() => setActiveTab("products")}
          >
            Products
          </Tab>
        </Tabs>

        <ItemsGrid>
          {/* Appointments */}
          {activeTab === "appointments" &&
            filteredAppointments.map((apt) => (
              <ItemButton
                key={apt.id}
                $inCart={isInCart(apt.id, "appointment")}
                disabled={isInCart(apt.id, "appointment")}
                onClick={() =>
                  !isInCart(apt.id, "appointment") &&
                  onAddToCart({
                    ...apt,
                    type: "appointment",
                    name: apt.treatmentName,
                    price: apt.price || 0,
                    quantity: 1,
                  })
                }
              >
                <ItemName>{apt.treatmentName}</ItemName>
                <ItemMeta>
                  <Clock />
                  {apt.time} • {apt.clientName}
                </ItemMeta>
                <ItemFooter>
                  <ItemPrice>${(apt.price || 0).toFixed(2)}</ItemPrice>
                  {isInCart(apt.id, "appointment") ? (
                    <ItemStatus $variant="success">
                      <CheckCircle />
                      In cart
                    </ItemStatus>
                  ) : (
                    <Plus size={20} />
                  )}
                </ItemFooter>
              </ItemButton>
            ))}

          {/* Treatments */}
          {activeTab === "treatments" &&
            filteredTreatments.map((t) => (
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
                <ItemName>{t.name}</ItemName>
                <ItemMeta>
                  <Clock />
                  {t.durationMinutes || t.duration} min
                  {t.category && ` • ${t.category}`}
                </ItemMeta>
                <ItemFooter>
                  <ItemPrice>${(t.price || 0).toFixed(2)}</ItemPrice>
                  <Plus size={20} />
                </ItemFooter>
              </ItemButton>
            ))}

          {/* Products */}
          {activeTab === "products" &&
            filteredStock.map((p) => {
              const key = p.productId ?? p.id;
              const status = getProductStatus(key);
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
                  <ItemName>{p.name}</ItemName>
                  <ItemMeta>
                    <Package />
                    {p.category || "Product"}
                  </ItemMeta>
                  <ItemFooter>
                    <ItemPrice>${(p.price || 0).toFixed(2)}</ItemPrice>
                    {!canAdd ? (
                      <ItemStatus $variant="error">
                        <AlertCircle />
                        Out of stock
                      </ItemStatus>
                    ) : status.status === "low" ? (
                      <ItemStatus $variant="warning">
                        {status.available} left
                      </ItemStatus>
                    ) : (
                      <ItemStatus $variant="success">
                        {status.available} in stock
                      </ItemStatus>
                    )}
                  </ItemFooter>
                </ItemButton>
              );
            })}
        </ItemsGrid>
      </MainContent>

      {/* Cart Panel */}
      <CartPanel>
        <CartHeader>
          <CartTitle>
            <ShoppingBag size={20} />
            Cart
          </CartTitle>
          <CartCount>{cart.length}</CartCount>
        </CartHeader>

        <CartItems>
          {cart.length === 0 ? (
            <EmptyCart>
              <EmptyIcon>
                <ShoppingBag />
              </EmptyIcon>
              <div>Your cart is empty</div>
              <div style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                Add items to get started
              </div>
            </EmptyCart>
          ) : (
            cart.map((item: any, idx: number) => (
              <CartItem key={`${item.id}-${item.type}-${idx}`}>
                <CartItemInfo>
                  <CartItemName>{item.name}</CartItemName>
                  {item.staffName && (
                    <CartItemDetail>Staff: {item.staffName}</CartItemDetail>
                  )}
                  <CartItemPrice>
                    ${(item.price * item.quantity).toFixed(2)}
                  </CartItemPrice>
                </CartItemInfo>

                <CartItemControls>
                  {item.type === "product" ? (
                    <QuantityControl>
                      <QuantityButton
                        onClick={() => onUpdateQuantity(item.id, item.type, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus />
                      </QuantityButton>
                      <QuantityDisplay>{item.quantity}</QuantityDisplay>
                      <QuantityButton
                        onClick={() => onUpdateQuantity(item.id, item.type, 1)}
                      >
                        <Plus />
                      </QuantityButton>
                    </QuantityControl>
                  ) : (
                    <QuantityDisplay style={{ padding: "0 0.5rem" }}>
                      Qty: {item.quantity}
                    </QuantityDisplay>
                  )}

                  <DeleteButton
                    onClick={() => onRemoveFromCart(item.id, item.type)}
                    aria-label="Remove item"
                  >
                    <Trash2 />
                  </DeleteButton>
                </CartItemControls>
              </CartItem>
            ))
          )}
        </CartItems>

        <CartActions>
          <CartTotal>
            <span>Subtotal:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </CartTotal>

          {!canProceed && (
            <ErrorMessage>
              <AlertCircle size={16} />
              <span>Please add at least one item to continue</span>
            </ErrorMessage>
          )}

          <Button
            variation="primary"
            size="large"
            onClick={onNext}
            disabled={!canProceed}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Continue
            <ArrowRight size={18} />
          </Button>

          <Button
            variation="secondary"
            size="medium"
            onClick={onBack}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </CartActions>
      </CartPanel>
    </Container>
  );
}
