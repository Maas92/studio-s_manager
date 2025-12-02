import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useState, useCallback, useMemo, useEffect } from "react";
import POSStepWrapper from "./POSStepWrapper";
import ClientSelection from "./ClientSelection";
import ItemSelection from "./ItemSelection";
import StaffAssignment from "./StaffAssignment";
import Payment from "./Payment";
import CreateClientModal from "./CreateClientModal";
import ReceiptAndNextAppointment from "./ReceiptAndNextAppointment";
import {
  createTransaction,
  createClient,
  createAppointment as createAppointmentAPI,
  completeAppointment,
  updateStockAfterSale,
  saveDraft,
  loadDraft,
  clearDraft,
  type CartItem,
  type CreateTransactionInput,
  type CreateClientInput,
  type CreateAppointmentInput,
  type Discount,
  type Tips,
  type PaymentBreakdown,
  type CartValidation,
  type Transaction,
} from "./api";
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

export default function PointOfSale({ isAdmin = false }: PointOfSaleProps) {
  const queryClient = useQueryClient();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Data state
  const [clientType, setClientType] = useState<"booked" | "walk-in">("booked");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedClientData, setSelectedClientData] = useState<any>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<Discount>({
    type: "percentage",
    value: 0,
  });
  const [tips, setTips] = useState<Tips>({});
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);

  // Product stock tracking
  const [productStock, setProductStock] = useState<Record<string, number>>({});

  // Modal state
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [completedTransaction, setCompletedTransaction] =
    useState<Transaction | null>(null);

  // Using mock data
  const clients = mockClients;
  const appointments = mockAppointments || [];
  const products = mockProducts;
  const treatments = mockTreatments;
  const staff = mockStaff;

  // Initialize product stock
  useEffect(() => {
    const stockMap: Record<string, number> = {};
    products.forEach((product) => {
      stockMap[product.id] = product.stock || 0;
    });
    setProductStock(stockMap);
  }, [products]);

  // Auto-save draft
  useEffect(() => {
    if (cart.length === 0 || currentStep === 1 || completedTransaction) return;

    const timer = setTimeout(() => {
      const draft = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        clientId: selectedClient,
        clientData: selectedClientData,
        cart,
        discount,
        tips,
        currentStep,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      saveDraft(draft);
    }, 30000);

    return () => clearTimeout(timer);
  }, [
    cart,
    selectedClient,
    selectedClientData,
    discount,
    tips,
    currentStep,
    completedTransaction,
  ]);

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (newClient) => {
      setSelectedClient(newClient.id);
      setSelectedClientData(newClient);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created successfully!");
      markStepCompleted(1);
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
    onSuccess: async (data) => {
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

      clearDraft();
      setCompletedTransaction(data);
      markStepCompleted(needsStaffAssignment ? 4 : 3);

      toast.success("Transaction completed successfully!", {
        duration: 4000,
        icon: "✅",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to complete transaction",
        { duration: 5000 }
      );
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: createAppointmentAPI,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(`Appointment booked for ${data.clientName || "client"}!`, {
        duration: 4000,
        position: "top-right",
      });
      resetPOS();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to book appointment",
        { duration: 5000 }
      );
    },
  });

  // Calculate if treatments need staff
  const needsStaffAssignment = useMemo(
    () =>
      cart.some(
        (item) => item.type === "treatment" || item.type === "appointment"
      ),
    [cart]
  );

  // Define steps
  const steps = useMemo(() => {
    if (completedTransaction) {
      return [
        { number: 1, label: "Select Client", completed: true },
        { number: 2, label: "Add Items", completed: true },
        ...(needsStaffAssignment
          ? [{ number: 3, label: "Assign Staff", completed: true }]
          : []),
        {
          number: needsStaffAssignment ? 4 : 3,
          label: "Payment",
          completed: true,
        },
        {
          number: needsStaffAssignment ? 5 : 4,
          label: "Complete",
          completed: true,
        },
      ];
    }

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
  }, [completedSteps, needsStaffAssignment, completedTransaction]);

  // Navigation
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setSelectedAppointmentId("");
    setCart([]);
    setDiscount({ type: "percentage", value: 0 });
    setTips({});
    setLoyaltyPointsToRedeem(0);
    setCompletedTransaction(null);
    clearDraft();
  }, []);

  // Step 1: Client Selection
  const handleSelectClient = useCallback(
    (
      clientId: string,
      type: "booked" | "walk-in",
      appointmentId?: string,
      verified?: boolean
    ) => {
      setClientType(type);
      if (clientId) {
        setSelectedClient(clientId);
        const client = clients.find((c) => c.id === clientId);
        setSelectedClientData(client || null);
      }
      if (appointmentId) {
        setSelectedAppointmentId(appointmentId);

        const apt = appointments.find((a) => a.id === appointmentId);
        if (apt) {
          setCart([
            {
              id: apt.id,
              type: "appointment",
              name: apt.treatmentName,
              price: apt.price,
              originalPrice: apt.price,
              quantity: 1,
              appointmentId: apt.id,
              clientName: apt.clientName,
              staffId: apt.staffId,
              staffName: apt.staffName,
              duration: apt.duration,
              isAppointmentCheckin: true,
              locked: true,
            },
          ]);
        }
      }
      markStepCompleted(1);
      goToStep(2);
    },
    [clients, appointments, markStepCompleted, goToStep]
  );

  const handleCreateClient = useCallback(
    (clientData: CreateClientInput) => {
      createClientMutation.mutate(clientData);
      setShowCreateClient(false);
    },
    [createClientMutation]
  );

  // Step 2: Item Selection
  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity">, validation: CartValidation) => {
      if (!validation.canAdd) {
        toast.error(validation.reason || "Cannot add item to cart");
        return;
      }

      if (validation.warnings) {
        validation.warnings.forEach((warning) => {
          toast(warning, { icon: "⚠️", duration: 3000 });
        });
      }

      setCart((prev) => [...prev, { ...item, quantity: 1 }]);
      toast.success(`${item.name} added to cart`);
    },
    []
  );

  const updateQuantity = useCallback(
    (id: string, type: string, delta: number) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id === id && item.type === type) {
            const newQuantity = Math.max(1, item.quantity + delta);
            if (item.maxQuantity && newQuantity > item.maxQuantity) {
              toast.error("Maximum quantity reached");
              return item;
            }
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
    toast.success("Item removed from cart");
  }, []);

  const updateNotes = useCallback((id: string, type: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id && item.type === type) {
          return { ...item, notes };
        }
        return item;
      })
    );
  }, []);

  const handleItemSelectionNext = useCallback(() => {
    if (cart.length === 0) {
      toast.error("Please add at least one item to cart");
      return;
    }
    markStepCompleted(2);
    if (needsStaffAssignment) {
      goToStep(3);
    } else {
      goToStep(3);
    }
  }, [cart.length, markStepCompleted, goToStep, needsStaffAssignment]);

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
      toast.success(`${staffName} assigned`);
    },
    []
  );

  const handleStaffAssignmentNext = useCallback(() => {
    const allAssigned = cart
      .filter(
        (item) => item.type === "treatment" || item.type === "appointment"
      )
      .every((item) => item.staffId);

    if (!allAssigned) {
      toast.error("Please assign staff to all treatments");
      return;
    }

    markStepCompleted(3);
    goToStep(4);
  }, [cart, markStepCompleted, goToStep]);

  // Step 4: Payment
  const handlePaymentComplete = useCallback(
    (payments: PaymentBreakdown[]) => {
      const transactionInput: CreateTransactionInput = {
        clientId: selectedClient || undefined,
        items: cart,
        discount,
        payments,
        tips,
        loyaltyPointsRedeemed: loyaltyPointsToRedeem,
      };

      createTransactionMutation.mutate(transactionInput);
    },
    [
      selectedClient,
      cart,
      discount,
      tips,
      loyaltyPointsToRedeem,
      createTransactionMutation,
    ]
  );

  // Step 5: Book Next Appointment
  const handleBookAppointment = useCallback(
    (appointmentData: CreateAppointmentInput) => {
      createAppointmentMutation.mutate(appointmentData);
    },
    [createAppointmentMutation]
  );

  // Render completed transaction
  if (completedTransaction) {
    return (
      <POSStepWrapper currentStep={steps.length} steps={steps}>
        <ReceiptAndNextAppointment
          transaction={completedTransaction}
          client={selectedClientData}
          treatments={treatments}
          staff={staff}
          onBookAppointment={handleBookAppointment}
          onNewSale={resetPOS}
          bookingAppointment={createAppointmentMutation.isPending}
        />
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
            appointments={appointments}
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
            productStock={productStock}
            onAddToCart={addToCart}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onUpdateNotes={updateNotes}
            onNext={handleItemSelectionNext}
            onBack={() => goToStep(1)}
          />
        )}

        {/* Step 3: Staff Assignment (conditional) */}
        {currentStep === 3 && needsStaffAssignment && (
          <StaffAssignment
            cart={cart}
            staff={staff}
            onAssignStaff={assignStaff}
            onNext={handleStaffAssignmentNext}
            onBack={() => goToStep(2)}
          />
        )}

        {/* Step 3 or 4: Payment */}
        {((currentStep === 3 && !needsStaffAssignment) ||
          (currentStep === 4 && needsStaffAssignment)) && (
          <Payment
            cart={cart}
            clientName={selectedClientData?.name}
            clientLoyaltyPoints={selectedClientData?.loyaltyPoints || 0}
            discount={discount}
            tips={tips}
            loyaltyPointsToRedeem={loyaltyPointsToRedeem}
            onUpdateDiscount={setDiscount}
            onUpdateTips={setTips}
            onUpdateLoyaltyRedemption={setLoyaltyPointsToRedeem}
            onComplete={handlePaymentComplete}
            onBack={() => goToStep(needsStaffAssignment ? 3 : 2)}
            onEditCart={() => goToStep(2)}
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
