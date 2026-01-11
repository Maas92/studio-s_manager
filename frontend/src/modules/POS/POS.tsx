import React, { useState, useCallback, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { ArrowLeft, Save, AlertTriangle, Check } from "lucide-react";

import Button from "../../ui/components/Button";
import POSStepIndicator from "./POSStepIndicator";
import ClientSelection from "./ClientSelection";
import ItemSelection from "./ItemSelection";
import StaffAssignment from "./StaffAssignment";
import PaymentReview from "./PaymentReview";
import ReceiptAndNext from "./ReceiptAndNext";
import CreateClientModal from "./CreateClientModal";

import { useClients } from "../clients/useClient";
import { useAppointments } from "../appointments/useAppointments";
import { useTreatments } from "../treatments/useTreatments";
import { useStaff } from "../staff/useStaff";
import { useStock } from "../stock/useStock";
import { usePos } from "./usePOS";
import useAuth from "../../hooks/useAuth";

import type { CartItem } from "./POSSchema";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
  padding: 2rem 1rem;
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const StepContent = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  box-shadow: ${({ theme }) => theme.shadowMd};
  min-height: 600px;
`;

const DraftBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${({ theme }) => theme.color.yellow100};
  border: 1px solid ${({ theme }) => theme.color.yellow700};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.color.grey900};
`;

const DraftContent = styled.div`
  flex: 1;

  strong {
    font-weight: 700;
  }
`;

const DraftActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
  { number: 1, label: "Select Client" },
  { number: 2, label: "Add Items" },
  { number: 3, label: "Assign Staff" },
  { number: 4, label: "Payment" },
  { number: 5, label: "Complete" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PointOfSale() {
  const qc = useQueryClient();
  const { canManageStock } = useAuth();

  // ============================================================================
  // STATE
  // ============================================================================
  const [currentStep, setCurrentStep] = useState(1);
  const [clientType, setClientType] = useState<"booked" | "walk-in">("booked");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState({
    type: "percentage" as const,
    value: 0,
    reason: "",
  });
  const [tips, setTips] = useState<Record<string, number>>({});
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [completedTransaction, setCompletedTransaction] = useState<any | null>(
    null
  );
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // ============================================================================
  // HOOKS
  // ============================================================================
  const { listQuery: clientsQuery, createMutation: createClientMutation } =
    useClients();
  const { listQuery: appointmentsQuery } = useAppointments();
  const { listQuery: treatmentsQuery } = useTreatments();
  const { listQuery: staffQuery } = useStaff();
  const { listQuery: stockQuery, updateMutation: stockUpdateMutation } =
    useStock();
  const { createMutation: createTransactionMutation } = usePos();

  const clients = clientsQuery.data ?? [];
  const appointments = appointmentsQuery.data ?? [];
  const treatments = treatmentsQuery.data ?? [];
  const staff = staffQuery.data ?? [];
  const stockItems = stockQuery.data ?? [];

  // ============================================================================
  // PRODUCT STOCK MAP
  // ============================================================================
  const productStock = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of stockItems) {
      if (item.location === "retail") {
        map[item.id] = item.quantity ?? 0;
      }
    }
    return map;
  }, [stockItems]);

  // ============================================================================
  // DRAFT MANAGEMENT
  // ============================================================================
  useEffect(() => {
    try {
      const draft = localStorage.getItem("pos_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (new Date(parsed.expiresAt) > new Date()) {
          setHasDraft(true);
        } else {
          localStorage.removeItem("pos_draft");
        }
      }
    } catch (err) {
      console.error("Failed to load draft:", err);
    }
  }, []);

  const saveDraft = useCallback(() => {
    if (cart.length > 0 || selectedClient) {
      try {
        const draft = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          clientId: selectedClient?.id,
          clientData: selectedClient,
          cart,
          discount,
          tips,
          currentStep,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        localStorage.setItem("pos_draft", JSON.stringify(draft));
        toast.success("Draft saved", { duration: 2000 });
      } catch (err) {
        console.error("Failed to save draft:", err);
        toast.error("Failed to save draft");
      }
    }
  }, [cart, selectedClient, discount, tips, currentStep]);

  const loadDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem("pos_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        setSelectedClient(parsed.clientData);
        setCart(parsed.cart);
        setDiscount(parsed.discount);
        setTips(parsed.tips);
        setCurrentStep(parsed.currentStep);
        setHasDraft(false);
        toast.success("Draft loaded");
      }
    } catch (err) {
      console.error("Failed to load draft:", err);
      toast.error("Failed to load draft");
    }
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem("pos_draft");
    setHasDraft(false);
  }, []);

  // ============================================================================
  // CART OPERATIONS
  // ============================================================================
  const addToCart = useCallback(
    (item: any) => {
      setCart((prev) => {
        // Appointments: only one per ID
        if (item.type === "appointment") {
          if (prev.some((p) => p.type === "appointment" && p.id === item.id)) {
            toast.error("This appointment is already in the cart");
            return prev;
          }
        }

        // Products: merge quantities
        if (item.type === "product") {
          const existingIdx = prev.findIndex(
            (p) => p.type === "product" && p.productId === item.productId
          );

          if (existingIdx >= 0) {
            const existing = prev[existingIdx];
            const newQuantity = existing.quantity + 1;
            const stock = productStock[item.productId] || 0;

            if (newQuantity > stock) {
              toast.error("Insufficient stock available");
              return prev;
            }

            const updated = [...prev];
            updated[existingIdx] = { ...existing, quantity: newQuantity };
            return updated;
          }

          // Check stock for new item
          const stock = productStock[item.productId] || 0;
          if (stock < 1) {
            toast.error("Out of stock");
            return prev;
          }
        }

        return [...prev, { ...item, quantity: item.quantity ?? 1 }];
      });
    },
    [productStock]
  );

  const updateQuantity = useCallback(
    (id: string, type: string, delta: number) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id !== id || item.type !== type) return item;

          const newQuantity = Math.max(1, item.quantity + delta);

          // Check stock for products
          if (type === "product") {
            const stock = productStock[item.productId || item.id] || 0;
            if (newQuantity > stock) {
              toast.error("Insufficient stock");
              return item;
            }
          }

          return { ...item, quantity: newQuantity };
        })
      );
    },
    [productStock]
  );

  const removeFromCart = useCallback((id: string, type: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === id && item.type === type))
    );
  }, []);

  const assignStaff = useCallback(
    (itemId: string, itemType: string, staffId: string, staffName: string) => {
      setCart((prev) =>
        prev.map((item) =>
          item.id === itemId && item.type === itemType
            ? { ...item, staffId, staffName }
            : item
        )
      );
    },
    []
  );

  const updatePrice = useCallback(
    (id: string, type: string, newPrice: number) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id === id && item.type === type) {
            return {
              ...item,
              price: newPrice,
              // Keep originalPrice for tracking purposes
              originalPrice: item.originalPrice || item.price,
            };
          }
          return item;
        })
      );
      toast.success("Price updated");
    },
    []
  );

  // ============================================================================
  // CLIENT OPERATIONS
  // ============================================================================
  const handleCreateClient = useCallback(
    async (payload: any) => {
      try {
        const newClient = await createClientMutation.mutateAsync(payload);
        toast.success("Client created successfully!");
        setSelectedClient(newClient);
        setShowCreateClient(false);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create client");
      }
    },
    [createClientMutation]
  );

  const handleSelectClient = useCallback(
    (clientId: string, type: "booked" | "walk-in", appointmentId?: string) => {
      const client = clients.find((c) => c.id === clientId);
      setClientType(type);
      setSelectedClient(client ?? null);
      setSelectedAppointmentId(appointmentId ?? null);

      // If booked appointment, add it to cart automatically
      if (type === "booked" && appointmentId) {
        const apt = appointments.find((a) => a.id === appointmentId);
        if (apt) {
          addToCart({
            id: apt.id,
            type: "appointment",
            name: apt.treatmentName,
            price: apt.price || 0,
            quantity: 1,
            clientName: apt.clientName,
            treatmentId: apt.treatmentId,
            staffId: apt.staffId,
            staffName: apt.staffName,
            duration: apt.duration,
            isAppointmentCheckin: true,
          });
        }
      }

      setCurrentStep(2);
    },
    [clients, appointments, addToCart]
  );

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  const goToStep = useCallback(
    (step: number) => {
      // Validate before moving forward
      if (step > currentStep) {
        if (currentStep === 1 && !selectedClient) {
          toast.error("Please select a client first");
          return;
        }
        if (currentStep === 2 && cart.length === 0) {
          toast.error("Please add items to cart");
          return;
        }
        if (currentStep === 3) {
          const treatmentItems = cart.filter(
            (item) => item.type === "treatment" || item.type === "appointment"
          );
          const unassigned = treatmentItems.filter((item) => !item.staffId);
          if (unassigned.length > 0) {
            toast.error(
              `Please assign staff to all treatments (${unassigned.length} remaining)`
            );
            return;
          }
        }
      }
      setCurrentStep(step);
    },
    [currentStep, selectedClient, cart]
  );

  // ============================================================================
  // PAYMENT
  // ============================================================================
  const handleCompletePayment = useCallback(
    async (payments: any[]) => {
      if (cart.length === 0) {
        toast.error("Cart is empty");
        return;
      }

      try {
        const payload = {
          clientId: selectedClient?.id,
          items: cart.map((item) => ({
            id: item.id,
            type: item.type,
            referenceId: item.type === "product" ? item.productId : item.id,
            name: item.name,
            price: item.price,
            originalPrice: item.originalPrice || item.price,
            quantity: item.quantity,
            notes: item.notes,
            staffId: item.staffId,
            staffName: item.staffName,
          })),
          discount,
          payments,
          tips,
          loyaltyPointsRedeemed: loyaltyPointsToRedeem,
        };

        const tx = await createTransactionMutation.mutateAsync(payload as any);

        // Update stock for products
        const productItems = cart.filter((i) => i.type === "product");
        await Promise.allSettled(
          productItems.map((p) => {
            const stockItem = stockItems.find(
              (s) => s.id === (p.productId || p.id) && s.location === "retail"
            );
            if (!stockItem) return Promise.resolve();

            return stockUpdateMutation.mutateAsync({
              id: stockItem.id,
              updates: {
                quantity: Math.max(0, stockItem.quantity - p.quantity),
              },
            });
          })
        );

        setCompletedTransaction(tx);
        setCurrentStep(5);
        clearDraft();

        // Invalidate queries
        qc.invalidateQueries({ queryKey: ["stock"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["clients"] });

        toast.success("Payment completed successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message ?? "Failed to complete payment");
      }
    },
    [
      cart,
      selectedClient,
      discount,
      tips,
      loyaltyPointsToRedeem,
      createTransactionMutation,
      stockItems,
      stockUpdateMutation,
      qc,
      clearDraft,
    ]
  );

  // ============================================================================
  // RESET
  // ============================================================================
  const handleNewSale = useCallback(() => {
    setCurrentStep(1);
    setClientType("booked");
    setSelectedClient(null);
    setSelectedAppointmentId(null);
    setCart([]);
    setDiscount({ type: "percentage", value: 0, reason: "" });
    setTips({});
    setLoyaltyPointsToRedeem(0);
    setCompletedTransaction(null);
    clearDraft();
  }, [clearDraft]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <PageWrapper>
      <Container>
        <Header>
          <Title>Point of Sale</Title>
          <HeaderActions>
            {currentStep > 1 && currentStep < 5 && (
              <>
                <Button
                  variation="secondary"
                  size="medium"
                  onClick={saveDraft}
                  disabled={cart.length === 0 && !selectedClient}
                >
                  <Save size={16} />
                  Save Draft
                </Button>
                <Button
                  variation="secondary"
                  size="medium"
                  onClick={handleNewSale}
                >
                  <ArrowLeft size={16} />
                  Cancel Sale
                </Button>
              </>
            )}
          </HeaderActions>
        </Header>

        {hasDraft && (
          <DraftBanner>
            <AlertTriangle size={20} />
            <DraftContent>
              <strong>You have a saved draft</strong> - Would you like to
              continue where you left off?
            </DraftContent>
            <DraftActions>
              <Button variation="primary" size="small" onClick={loadDraft}>
                Load Draft
              </Button>
              <Button variation="secondary" size="small" onClick={clearDraft}>
                Dismiss
              </Button>
            </DraftActions>
          </DraftBanner>
        )}

        {currentStep < 5 && (
          <POSStepIndicator
            steps={STEPS.slice(0, 4)}
            currentStep={currentStep}
            onStepClick={goToStep}
          />
        )}

        <StepContent>
          {currentStep === 1 && (
            <ClientSelection
              clients={clients}
              appointments={appointments}
              onSelectClient={handleSelectClient}
              onCreateNew={() => setShowCreateClient(true)}
            />
          )}

          {currentStep === 2 && (
            <ItemSelection
              clientType={clientType}
              clientName={selectedClient?.name}
              appointments={appointments}
              treatments={treatments}
              stockItems={stockItems}
              cart={cart}
              productStock={productStock}
              onAddToCart={addToCart}
              onUpdateQuantity={updateQuantity}
              onUpdatePrice={updatePrice}
              onRemoveFromCart={removeFromCart}
              onNext={() => goToStep(3)}
              onBack={() => goToStep(1)}
            />
          )}

          {currentStep === 3 && (
            <StaffAssignment
              cart={cart}
              staff={staff.map((s) => ({
                id: s.id,
                name: `${s.firstName} ${s.lastName}`,
                role: s.role,
                specialties: s.specializations,
                available: s.status === "active",
              }))}
              onAssignStaff={assignStaff}
              onNext={() => goToStep(4)}
              onBack={() => goToStep(2)}
            />
          )}

          {currentStep === 4 && (
            <PaymentReview
              cart={cart}
              client={selectedClient}
              discount={discount}
              tips={tips}
              loyaltyPointsToRedeem={loyaltyPointsToRedeem}
              onUpdateDiscount={setDiscount}
              onUpdateTips={setTips}
              onUpdateLoyaltyRedemption={setLoyaltyPointsToRedeem}
              onComplete={handleCompletePayment}
              onBack={() => goToStep(3)}
              onEditCart={() => goToStep(2)}
              processing={createTransactionMutation.isPending}
            />
          )}

          {currentStep === 5 && completedTransaction && (
            <ReceiptAndNext
              transaction={completedTransaction}
              client={selectedClient}
              treatments={treatments}
              staff={staff.map((s) => ({
                id: s.id,
                name: `${s.firstName} ${s.lastName}`,
                role: s.role,
                specialties: s.specializations,
                available: s.status === "active",
              }))}
              onBookAppointment={async (data) => {
                toast.success("Appointment booked!");
                handleNewSale();
              }}
              onNewSale={handleNewSale}
              onClose={handleNewSale}
            />
          )}
        </StepContent>
      </Container>

      <CreateClientModal
        isOpen={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onSubmit={handleCreateClient}
        submitting={createClientMutation.isPending}
      />
    </PageWrapper>
  );
}
