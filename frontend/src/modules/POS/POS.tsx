import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useState, useCallback, useMemo } from "react";
import styled from "styled-components";
import { Check } from "lucide-react";
import POSStepWrapper from "./POSStepWrapper";
import ClientSelection from "./ClientSelection";
import ItemSelection from "./ItemSelection";
import StaffAssignment from "./StaffAssignment";
import Payment from "./Payment";
import CreateClientModal from "./CreateClientModal";
import {
  createTransaction,
  createClient,
  completeAppointment,
  updateStockAfterSale,
  type CartItem,
  type CreateTransactionInput,
  type CreateClientInput,
} from "./api";

// For development - replace with real API calls
import {
  mockClients,
  mockAppointments,
  mockProducts,
  mockTreatments,
  mockStaff,
} from "./mockData";

interface PointOfSaleProps {
  isAdmin?: boolean;
}

const SuccessScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
`;

const SuccessIcon = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.green500};
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  animation: scaleIn 0.3s ease-out;

  @keyframes scaleIn {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }
`;

const SuccessTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
  margin: 0 0 0.5rem 0;
`;

const SuccessMessage = styled.p`
  font-size: 1.125rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin: 0 0 2rem 0;
`;

export default function PointOfSale({ isAdmin = false }: PointOfSaleProps) {
  const queryClient = useQueryClient();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Data state
  const [clientType, setClientType] = useState<"booked" | "walk-in">("booked");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedClientData, setSelectedClientData] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState({
    type: "percentage" as "percentage" | "fixed",
    value: 0,
  });

  // Modal state
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Using mock data - replace with real queries
  const clients = mockClients;
  const appointments = mockAppointments;
  const products = mockProducts;
  const treatments = mockTreatments;
  const staff = mockStaff;

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (newClient) => {
      setSelectedClient(newClient.id);
      setSelectedClientData(newClient);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created successfully!");
      goToStep(2);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create client"
      );
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: async () => {
      // Mark appointments as completed
      const appointmentItems = cart.filter(
        (item) => item.type === "appointment"
      );
      for (const item of appointmentItems) {
        if (item.appointmentId) {
          await completeAppointment(item.appointmentId);
        }
      }

      // Update stock
      await updateStockAfterSale(cart);

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      setShowSuccess(true);

      setTimeout(() => {
        resetPOS();
      }, 3000);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to complete transaction"
      );
    },
  });

  // Calculate if treatments need staff (for step visibility)
  const needsStaffAssignment = useMemo(
    () =>
      cart.some(
        (item) => item.type === "treatment" || item.type === "appointment"
      ),
    [cart]
  );

  // Define steps based on needs
  const steps = useMemo(() => {
    const baseSteps = [
      {
        number: 1,
        label: "Select Client",
        completed: completedSteps.includes(1),
      },
      { number: 2, label: "Add Items", completed: completedSteps.includes(2) },
    ];

    if (needsStaffAssignment) {
      baseSteps.push({
        number: 3,
        label: "Assign Staff",
        completed: completedSteps.includes(3),
      });
      baseSteps.push({
        number: 4,
        label: "Payment",
        completed: completedSteps.includes(4),
      });
    } else {
      baseSteps.push({
        number: 3,
        label: "Payment",
        completed: completedSteps.includes(3),
      });
    }

    return baseSteps;
  }, [completedSteps, needsStaffAssignment]);

  // Navigation
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps((prev) => [...new Set([...prev, step])]);
  }, []);

  // Reset POS
  const resetPOS = useCallback(() => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setClientType("booked");
    setSelectedClient("");
    setSelectedClientData(null);
    setCart([]);
    setDiscount({ type: "percentage", value: 0 });
    setShowSuccess(false);
  }, []);

  // Step 1: Client Selection
  const handleSelectClient = useCallback(
    (clientId: string, type: "booked" | "walk-in") => {
      setClientType(type);
      if (clientId) {
        setSelectedClient(clientId);
        const client = clients.find((c) => c.id === clientId);
        setSelectedClientData(client || null);
      }
      markStepCompleted(1);
      goToStep(2);
    },
    [clients, markStepCompleted, goToStep]
  );

  const handleCreateClient = useCallback(
    (clientData: CreateClientInput) => {
      createClientMutation.mutate(clientData);
      setShowCreateClient(false);
    },
    [createClientMutation]
  );

  // Step 2: Item Selection
  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.id === item.id && i.type === item.type
      );
      if (existing && item.type === "product") {
        return prev.map((i) =>
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback(
    (id: string, type: string, delta: number) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id === id && item.type === type) {
            const newQuantity = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
      );
    },
    []
  );

  const removeFromCart = useCallback((id: string, type: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === id && item.type === type))
    );
  }, []);

  const handleStep2Next = useCallback(() => {
    markStepCompleted(2);
    if (needsStaffAssignment) {
      goToStep(3);
    } else {
      goToStep(3); // Go to payment (which is step 3 when no staff needed)
    }
  }, [markStepCompleted, goToStep, needsStaffAssignment]);

  // Step 3: Staff Assignment
  const assignStaff = useCallback(
    (itemId: string, itemType: string, staffId: string, staffName: string) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id === itemId && item.type === itemType) {
            return { ...item, staffId, staffName };
          }
          return item;
        })
      );
    },
    []
  );

  const handleStep3Next = useCallback(() => {
    markStepCompleted(3);
    goToStep(4);
  }, [markStepCompleted, goToStep]);

  // Step 4: Payment
  const handlePaymentComplete = useCallback(
    (paymentMethod: "cash" | "card" | "split", cashReceived?: number) => {
      const transactionInput: CreateTransactionInput = {
        clientId: selectedClient || undefined,
        items: cart,
        discount,
        paymentMethod,
        cashReceived,
      };

      createTransactionMutation.mutate(transactionInput);
    },
    [selectedClient, cart, discount, createTransactionMutation]
  );

  if (showSuccess) {
    return (
      <POSStepWrapper currentStep={steps.length} steps={steps}>
        <SuccessScreen>
          <SuccessIcon>
            <Check size={60} />
          </SuccessIcon>
          <SuccessTitle>Payment Successful!</SuccessTitle>
          <SuccessMessage>
            Transaction completed successfully. Starting new sale...
          </SuccessMessage>
        </SuccessScreen>
      </POSStepWrapper>
    );
  }

  return (
    <>
      <POSStepWrapper currentStep={currentStep} steps={steps}>
        {/* Step 1: Client Selection */}
        {currentStep === 1 && (
          <ClientSelection
            clients={clients}
            onSelectClient={handleSelectClient}
            onCreateNew={() => setShowCreateClient(true)}
          />
        )}

        {/* Step 2: Item Selection */}
        {currentStep === 2 && (
          <ItemSelection
            clientType={clientType}
            clientName={selectedClientData?.name}
            appointments={appointments}
            treatments={treatments}
            products={products}
            cart={cart}
            onAddToCart={addToCart}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onNext={handleStep2Next}
            onBack={() => goToStep(1)}
          />
        )}

        {/* Step 3: Staff Assignment (conditional) */}
        {currentStep === 3 && needsStaffAssignment && (
          <StaffAssignment
            cart={cart}
            staff={staff}
            onAssignStaff={assignStaff}
            onNext={handleStep3Next}
            onBack={() => goToStep(2)}
          />
        )}

        {/* Step 3 or 4: Payment (depends on whether staff assignment was needed) */}
        {((currentStep === 3 && !needsStaffAssignment) ||
          (currentStep === 4 && needsStaffAssignment)) && (
          <Payment
            cart={cart}
            clientName={selectedClientData?.name}
            discount={discount}
            onUpdateDiscount={(type, value) => setDiscount({ type, value })}
            onComplete={handlePaymentComplete}
            onBack={() => goToStep(needsStaffAssignment ? 3 : 2)}
            processing={createTransactionMutation.isPending}
          />
        )}
      </POSStepWrapper>

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onSubmit={handleCreateClient}
        submitting={createClientMutation.isPending}
      />
    </>
  );
}
