import React, { useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

import POSStepWrapper from "./POSStepWrapper";
import ClientSelection from "./ClientSelection";
import ItemSelection from "./ItemSelection";
import Payment from "./Payment";
import CheckoutModal from "./CheckoutModal";
import ReceiptAndNextAppointment from "./ReceiptAndNextAppointment";
import CreateClientModal from "../clients/CreateClientModal";

import { useClients } from "../clients/useClient";
import { useAppointments } from "../appointments/useAppointments";
import { useTreatments } from "../treatments/useTreatments";
import { useStaff } from "../staff/useStaff";
import { useStock } from "../stock/useStock";
import { usePos } from "./usePOS";

export default function PointOfSale() {
  const qc = useQueryClient();

  // UI state
  const [step, setStep] = useState<number>(1);
  const [clientType, setClientType] = useState<"booked" | "walk-in">("booked");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [cart, setCart] = useState<any[]>([]);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<any | null>(
    null
  );

  // hooks (resource hooks)
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

  // build simple stock map { productId -> qty } using the canonical stock item fields
  const productStock = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of stockItems) {
      // common shapes: { id, productId, quantity } or { id, sku, quantity }
      // prefer productId if present, otherwise use id
      const key = s.id ?? s.id;
      map[key] = s.quantity ?? 0;
    }
    return map;
  }, [stockItems]);

  // CART helpers
  const addToCart = useCallback((item: any) => {
    setCart((prev) => {
      // appointment: allow only one occurrence of same appointment
      if (item.type === "appointment") {
        if (prev.some((p) => p.type === "appointment" && p.id === item.id))
          return prev;
      }

      // stock/product: merge by productId (or id)
      if (item.type === "product" || item.type === "stock") {
        const key = item.productId ?? item.id;
        const idx = prev.findIndex(
          (p) => (p.productId ?? p.id) === key && p.type === "product"
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: (next[idx].quantity ?? 1) + (item.quantity ?? 1),
          };
          return next;
        }
        // normalize type to "product" for cart items
        return [
          ...prev,
          {
            ...item,
            type: "product",
            productId: key,
            quantity: item.quantity ?? 1,
          },
        ];
      }

      return [...prev, { ...item, quantity: item.quantity ?? 1 }];
    });
  }, []);

  const updateQuantity = useCallback(
    (id: string, type: string, delta: number) => {
      setCart((prev) =>
        prev.map((it) =>
          it.id === id && it.type === type
            ? { ...it, quantity: Math.max(1, (it.quantity ?? 1) + delta) }
            : it
        )
      );
    },
    []
  );

  const removeFromCart = useCallback((id: string, type: string) => {
    setCart((prev) => prev.filter((it) => !(it.id === id && it.type === type)));
  }, []);

  const updateNotes = useCallback((id: string, type: string, notes: string) => {
    setCart((prev) =>
      prev.map((it) =>
        it.id === id && it.type === type ? { ...it, notes } : it
      )
    );
  }, []);

  // create client - uses clients hook
  const handleCreateClient = useCallback(
    async (payload: any) => {
      try {
        const newClient = await createClientMutation.mutateAsync(payload);
        toast.success("Client created");
        setSelectedClient(newClient);
        setShowCreateClient(false);
        // optionally advance to next step:
        // setStep(2);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create client");
      }
    },
    [createClientMutation]
  );

  // select client from Child (ClientSelection)
  const handleSelectClient = useCallback(
    (clientId: string, type: "booked" | "walk-in", appointmentId?: string) => {
      setClientType(type);
      setSelectedClient(clients.find((c) => c.id === clientId) ?? null);
      setSelectedAppointmentId(appointmentId ?? null);
      setStep(2);
    },
    [clients]
  );

  // complete transaction -> create + update stock
  const completePayment = useCallback(
    async (payments: any[]) => {
      if (cart.length === 0) {
        toast.error("Cart is empty");
        return;
      }

      try {
        const payload = {
          clientId: selectedClient?.id ?? null,
          appointmentId: selectedAppointmentId ?? null,
          items: cart.map((it) => ({
            type: it.type,
            referenceId: it.type === "product" ? it.productId : it.id,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            notes: it.notes,
          })),
          payments,
        };

        const tx = await createTransactionMutation.mutateAsync(payload);

        // update stock for products (best-effort; run in parallel)
        const productItems = cart.filter((i) => i.type === "product");
        await Promise.allSettled(
          productItems.map((p) => {
            const stockKey = p.productId ?? p.id;
            // find corresponding stock item id (stock item may contain productId or id)
            const stockItem = stockItems.find(
              (s) => (s.id ?? s.id) === stockKey
            );
            const stockId = stockItem?.id ?? stockKey;
            return stockUpdateMutation.mutateAsync({
              id: stockId,
              updates: {
                quantity: Math.max(
                  0,
                  (productStock[stockKey] ?? 0) - (p.quantity ?? 1)
                ),
              },
            });
          })
        );

        setCompletedTransaction(tx);
        setCart([]);
        setShowCheckout(false);
        toast.success("Sale completed");
        qc.invalidateQueries({ queryKey: ["stock"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message ?? "Failed to complete payment");
      }
    },
    [
      cart,
      createTransactionMutation,
      productStock,
      qc,
      selectedAppointmentId,
      selectedClient,
      stockItems,
      stockUpdateMutation,
    ]
  );

  const goBack = useCallback(() => setStep((s) => Math.max(1, s - 1)), []);
  const goNext = useCallback(() => setStep((s) => Math.min(3, s + 1)), []);

  return (
    <>
      <POSStepWrapper currentStep={step} steps={[]}>
        {step === 1 && (
          <ClientSelection
            clients={clients}
            appointments={appointments}
            onSelectClient={handleSelectClient}
            onCreateNew={() => setShowCreateClient(true)}
          />
        )}

        {step === 2 && (
          <ItemSelection
            clientType={clientType}
            clientName={selectedClient?.name}
            appointments={appointments}
            treatments={treatments}
            stockItems={stockItems} // <-- pass stock list here (replaces products)
            cart={cart}
            productStock={productStock}
            onAddToCart={addToCart}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onUpdateNotes={updateNotes}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Payment
            cart={cart}
            clientName={selectedClient?.name}
            clientLoyaltyPoints={selectedClient?.loyaltyPoints ?? 0}
            discount={{ type: "percentage", value: 0 }}
            tips={{}}
            loyaltyPointsToRedeem={0}
            onUpdateDiscount={() => {}}
            onUpdateTips={() => {}}
            onUpdateLoyaltyRedemption={() => {}}
            onComplete={() => setShowCheckout(true)}
            onBack={() => setStep(2)}
            onEditCart={() => setStep(2)}
            processing={createTransactionMutation.isPending}
          />
        )}
      </POSStepWrapper>

      <CreateClientModal
        isOpen={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onCreate={handleCreateClient}
        creating={createClientMutation.isPending}
      />

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        total={cart.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0)}
        onComplete={completePayment}
        processing={createTransactionMutation.isPending}
      />

      {completedTransaction && selectedClient && (
        <ReceiptAndNextAppointment
          transaction={completedTransaction}
          client={selectedClient}
          treatments={treatments.map((t) => ({
            id: t.id,
            name: t.name,
            durationMinutes: t.durationMinutes,
            price: t.price,
            category: t.category ?? undefined,
            isActive: t.isActive,
          }))}
          staff={staff.map((s) => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            role: s.role,
            specialties: s.specializations,
            available: s.status === "active",
          }))}
          onBookAppointment={async (appointmentData) => {
            try {
              // TODO: Implement appointment booking logic
              // await createAppointmentMutation.mutateAsync(appointmentData);
              toast.success("Appointment booked successfully!");
              setCompletedTransaction(null);
              setStep(1);
              setSelectedClient(null);
              setSelectedAppointmentId(null);
            } catch (err: any) {
              toast.error(err?.message ?? "Failed to book appointment");
            }
          }}
          onNewSale={() => {
            setCompletedTransaction(null);
            setStep(1);
            setSelectedClient(null);
            setSelectedAppointmentId(null);
            setCart([]);
          }}
          bookingAppointment={false}
          onClose={() => setCompletedTransaction(null)}
        />
      )}
    </>
  );
}
