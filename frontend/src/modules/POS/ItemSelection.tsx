import React, { useState, useMemo } from "react";
import styled from "styled-components";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import {
  Calendar,
  Clock,
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import type { CartItem, CartValidation } from "./api";
import { validateAddToCart } from "./api";

interface ItemSelectionProps {
  clientType: "booked" | "walk-in";
  clientName?: string;
  appointments: any[];
  treatments: any[];
  products: any[];
  cart: CartItem[];
  productStock: Record<string, number>;
  onAddToCart: (
    item: Omit<CartItem, "quantity">,
    validation: CartValidation
  ) => void;
  onUpdateQuantity: (id: string, type: string, delta: number) => void;
  onRemoveFromCart: (id: string, type: string) => void;
  onUpdateNotes: (id: string, type: string, notes: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 2rem;
  height: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const LeftPanel = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
  margin: 0;
`;

const ClientBanner = styled.div`
  padding: 1rem 1.25rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 1px solid ${({ theme }) => theme.color.brand200};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SearchBar = styled.div`
  position: relative;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.color.mutedText};
  pointer-events: none;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.875rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.color.brand500 : "transparent")};
  color: ${({ $active, theme }) =>
    $active ? theme.color.brand500 : theme.color.mutedText};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    color: ${({ theme }) => theme.color.brand500};
  }
`;

const Badge = styled.span<{
  $variant?: "primary" | "success" | "warning" | "danger";
}>`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case "success":
        return theme.color.green500 + "30";
      case "warning":
        return theme.color.yellow100;
      case "danger":
        return theme.color.red500 + "30";
      default:
        return theme.color.brand500 + "30";
    }
  }};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case "success":
        return theme.color.green500;
      case "warning":
        return theme.color.yellow700;
      case "danger":
        return theme.color.red500;
      default:
        return theme.color.brand500;
    }
  }};
`;

const ContentArea = styled.div`
  max-height: 500px;
  overflow-y: auto;
`;

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`;

const ItemCard = styled.button<{ $disabled?: boolean; $inCart?: boolean }>`
  padding: 1.25rem;
  background: ${({ $inCart, theme }) =>
    $inCart ? theme.color.green500 + "10" : theme.color.grey100};
  border: 1px solid
    ${({ $inCart, theme }) =>
      $inCart ? theme.color.green500 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s;
  text-align: left;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.brand500};
    background: ${({ $inCart, theme }) =>
      $inCart ? theme.color.green500 + "20" : theme.color.brand50};
    transform: translateY(-2px);
  }
`;

const ItemName = styled.div`
  font-weight: 700;
  font-size: 0.9375rem;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.color.text};
`;

const ItemMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const ItemFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ItemPrice = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.brand500};
`;

const ItemStatus = styled.div<{ $type: "inCart" | "lowStock" | "outOfStock" }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $type, theme }) => {
    switch ($type) {
      case "inCart":
        return theme.color.green500;
      case "lowStock":
        return theme.color.yellow700;
      case "outOfStock":
        return theme.color.red500;
    }
  }};
`;

const RightPanel = styled.div`
  background: ${({ theme }) => theme.color.grey50};
  border: 2px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: fit-content;
  position: sticky;
  top: 0;
`;

const CartTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 800;
  margin: 0 0 1.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.color.text};
`;

const CartItems = styled.div`
  flex: 1;
  max-height: 450px;
  overflow-y: auto;
  margin-bottom: 1.25rem;
`;

const EmptyCart = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const CartItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CartItemCard = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const CartItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const CartItemName = styled.div`
  font-weight: 700;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;
`;

const CartItemMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const CartItemFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
`;

const QuantityControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const QuantityButton = styled.button`
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.grey200};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.color.text};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.color.grey300};
  }
`;

const CartItemPrice = styled.div`
  font-weight: 800;
  font-size: 1rem;
  color: ${({ theme }) => theme.color.brand500};
`;

const NotesButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.color.grey100};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.color.grey200};
  }
`;

const NotesInput = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.text};
  font-size: 0.8125rem;
  margin-top: 0.5rem;
  min-height: 60px;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.brand500};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 2px solid ${({ theme }) => theme.color.border};
`;

const Warning = styled.div`
  display: flex;
  align-items: start;
  gap: 0.75rem;
  padding: 0.875rem;
  background: ${({ theme }) => theme.color.yellow100};
  border: 1px solid ${({ theme }) => theme.color.yellow700};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.grey900};
  margin-bottom: 0.75rem;
`;

type ActiveTab = "appointments" | "treatments" | "products";

export default function ItemSelection({
  clientType,
  clientName,
  appointments,
  treatments,
  products,
  cart,
  productStock,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onUpdateNotes,
  onNext,
  onBack,
}: ItemSelectionProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    clientType === "booked" ? "appointments" : "treatments"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter(
        (apt) =>
          apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.treatmentName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [appointments, searchQuery]
  );

  const filteredTreatments = useMemo(
    () =>
      treatments.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [treatments, searchQuery]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [products, searchQuery]
  );

  const isItemInCart = (id: string, type: string) => {
    // Only check for appointments (can't duplicate same appointment)
    // Treatments can be added multiple times
    if (type === "appointment") {
      return cart.some((item) => item.id === id && item.type === type);
    }
    return false;
  };

  const handleAddToCart = async (item: Omit<CartItem, "quantity">) => {
    const validation = validateAddToCart(item, cart, productStock);

    if (!validation.canAdd) {
      // Show error toast
      const toast = (await import("react-hot-toast")).default;
      toast.error(validation.reason || "Cannot add item to cart");
      return;
    }

    if (validation.warnings && validation.warnings.length > 0) {
      // Show warning toast
      const toast = (await import("react-hot-toast")).default;
      validation.warnings.forEach((warning) => {
        toast.warning(warning, { duration: 3000 });
      });
    }

    onAddToCart(item, validation);
  };

  const getProductStockStatus = (productId: string) => {
    const stock = productStock[productId] || 0;
    const inCart = cart
      .filter((i) => i.id === productId && i.type === "product")
      .reduce((sum, i) => sum + i.quantity, 0);
    const available = stock - inCart;

    if (available <= 0) return { status: "outOfStock", available: 0 };
    if (available <= 5) return { status: "lowStock", available };
    return { status: "inStock", available };
  };

  return (
    <Container>
      <LeftPanel>
        <div>
          <Title>Add Items to Cart</Title>
          {clientName && (
            <ClientBanner>
              <span>
                <strong>Client:</strong> {clientName}
              </span>
            </ClientBanner>
          )}
        </div>

        <SearchBar>
          <SearchIcon>
            <Search size={20} />
          </SearchIcon>
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "3rem" }}
          />
        </SearchBar>

        <Tabs>
          {clientType === "booked" && (
            <Tab
              $active={activeTab === "appointments"}
              onClick={() => setActiveTab("appointments")}
            >
              <Calendar size={16} />
              Appointments
              <Badge>{appointments.length}</Badge>
            </Tab>
          )}
          <Tab
            $active={activeTab === "treatments"}
            onClick={() => setActiveTab("treatments")}
          >
            <Clock size={16} />
            Treatments
          </Tab>
          <Tab
            $active={activeTab === "products"}
            onClick={() => setActiveTab("products")}
          >
            <Package size={16} />
            Products
          </Tab>
        </Tabs>

        <ContentArea>
          {activeTab === "appointments" && (
            <ItemGrid>
              {filteredAppointments.map((apt) => {
                const inCart = isItemInCart(apt.id, "appointment");
                return (
                  <ItemCard
                    key={apt.id}
                    type="button"
                    $inCart={inCart}
                    $disabled={inCart}
                    disabled={inCart}
                    onClick={() =>
                      !inCart &&
                      handleAddToCart({
                        id: apt.id,
                        type: "appointment",
                        name: apt.treatmentName,
                        price: apt.price,
                        originalPrice: apt.price,
                        appointmentId: apt.id,
                        clientName: apt.clientName,
                        staffId: apt.staffId,
                        staffName: apt.staffName,
                        duration: apt.duration,
                        isAppointmentCheckin: true,
                        locked: true,
                      })
                    }
                  >
                    <ItemName>{apt.treatmentName}</ItemName>
                    <ItemMeta>
                      <span>{apt.clientName}</span>
                      <span>{apt.time}</span>
                    </ItemMeta>
                    <ItemFooter>
                      <ItemPrice>${apt.price}</ItemPrice>
                      {inCart ? (
                        <ItemStatus $type="inCart">
                          <CheckCircle size={14} />
                          In Cart
                        </ItemStatus>
                      ) : (
                        <Plus size={20} />
                      )}
                    </ItemFooter>
                  </ItemCard>
                );
              })}
            </ItemGrid>
          )}

          {activeTab === "treatments" && (
            <ItemGrid>
              {filteredTreatments.map((treatment) => (
                <ItemCard
                  key={treatment.id}
                  type="button"
                  onClick={() =>
                    handleAddToCart({
                      id: treatment.id,
                      type: "treatment",
                      name: treatment.name,
                      price: treatment.price,
                      originalPrice: treatment.price,
                      duration: treatment.duration,
                    })
                  }
                >
                  <ItemName>{treatment.name}</ItemName>
                  <ItemMeta>
                    <span>{treatment.duration} min</span>
                    <span>{treatment.category}</span>
                  </ItemMeta>
                  <ItemFooter>
                    <ItemPrice>${treatment.price}</ItemPrice>
                    <Plus size={20} />
                  </ItemFooter>
                </ItemCard>
              ))}
            </ItemGrid>
          )}

          {activeTab === "products" && (
            <ItemGrid>
              {filteredProducts.map((product) => {
                const stockStatus = getProductStockStatus(product.id);
                const inCart = isItemInCart(product.id, "product");
                const canAdd = stockStatus.available > 0;

                return (
                  <ItemCard
                    key={product.id}
                    type="button"
                    $disabled={!canAdd}
                    disabled={!canAdd}
                    onClick={() =>
                      canAdd &&
                      handleAddToCart({
                        id: product.id,
                        type: "product",
                        name: product.name,
                        price: product.price,
                        originalPrice: product.price,
                        productId: product.id,
                        maxQuantity: stockStatus.available,
                      })
                    }
                  >
                    <ItemName>{product.name}</ItemName>
                    <ItemMeta>
                      <span>{product.category}</span>
                      {stockStatus.status === "outOfStock" ? (
                        <ItemStatus $type="outOfStock">
                          <AlertCircle size={12} />
                          Out of Stock
                        </ItemStatus>
                      ) : stockStatus.status === "lowStock" ? (
                        <ItemStatus $type="lowStock">
                          <AlertCircle size={12} />
                          {stockStatus.available} left
                        </ItemStatus>
                      ) : (
                        <Badge $variant="success">
                          {product.stock} in stock
                        </Badge>
                      )}
                    </ItemMeta>
                    <ItemFooter>
                      <ItemPrice>${product.price}</ItemPrice>
                      {canAdd && <Plus size={20} />}
                    </ItemFooter>
                  </ItemCard>
                );
              })}
            </ItemGrid>
          )}
        </ContentArea>
      </LeftPanel>

      <RightPanel>
        <CartTitle>
          <ShoppingCart size={20} />
          Cart
          {cart.length > 0 && <Badge>{cart.length}</Badge>}
        </CartTitle>

        <CartItems>
          {cart.length === 0 ? (
            <EmptyCart>
              <ShoppingCart
                size={40}
                style={{ margin: "0 auto 0.75rem", opacity: 0.3 }}
              />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>Cart is empty</p>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem" }}>
                Add items to get started
              </p>
            </EmptyCart>
          ) : (
            <CartItemList>
              {cart.map((item, idx) => (
                <CartItemCard key={`${item.id}-${item.type}-${idx}`}>
                  <CartItemHeader>
                    <div style={{ flex: 1 }}>
                      <CartItemName>{item.name}</CartItemName>
                      {item.clientName && (
                        <CartItemMeta>Client: {item.clientName}</CartItemMeta>
                      )}
                      {item.staffName && (
                        <CartItemMeta>Staff: {item.staffName}</CartItemMeta>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveFromCart(item.id, item.type)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        color: "#ef4444",
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </CartItemHeader>

                  {item.notes && (
                    <div
                      style={{
                        padding: "0.5rem",
                        background: "#fef3c7",
                        border: "1px solid #fbbf24",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      📝 {item.notes}
                    </div>
                  )}

                  <CartItemFooter>
                    {item.type === "product" ? (
                      <QuantityControls>
                        <QuantityButton
                          onClick={() =>
                            onUpdateQuantity(item.id, item.type, -1)
                          }
                        >
                          <Minus size={14} />
                        </QuantityButton>
                        <span
                          style={{
                            fontWeight: 600,
                            minWidth: "2rem",
                            textAlign: "center",
                          }}
                        >
                          {item.quantity}
                          {item.maxQuantity && `/${item.maxQuantity}`}
                        </span>
                        <QuantityButton
                          onClick={() =>
                            onUpdateQuantity(item.id, item.type, 1)
                          }
                          disabled={
                            item.maxQuantity
                              ? item.quantity >= item.maxQuantity
                              : false
                          }
                        >
                          <Plus size={14} />
                        </QuantityButton>
                      </QuantityControls>
                    ) : (
                      <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                        Qty: {item.quantity}
                      </span>
                    )}
                    <CartItemPrice>
                      ${(item.price * item.quantity).toFixed(2)}
                    </CartItemPrice>
                  </CartItemFooter>

                  {editingNotes === `${item.id}-${item.type}` ? (
                    <NotesInput
                      placeholder="Add notes or special instructions..."
                      defaultValue={item.notes || ""}
                      onBlur={(e) => {
                        onUpdateNotes(item.id, item.type, e.target.value);
                        setEditingNotes(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <NotesButton
                      onClick={() => setEditingNotes(`${item.id}-${item.type}`)}
                    >
                      <MessageSquare size={12} />
                      {item.notes ? "Edit Notes" : "Add Notes"}
                    </NotesButton>
                  )}
                </CartItemCard>
              ))}
            </CartItemList>
          )}
        </CartItems>

        <Actions>
          <Button
            variation="secondary"
            icon={<ArrowLeft size={18} />}
            onClick={onBack}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Back
          </Button>
          <Button
            variation="primary"
            icon={<ArrowRight size={18} />}
            onClick={onNext}
            disabled={cart.length === 0}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Next
          </Button>
        </Actions>
      </RightPanel>
    </Container>
  );
}
