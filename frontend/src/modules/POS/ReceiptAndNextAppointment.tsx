import React, { useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import {
  Calendar,
  Check,
  X,
  Mail,
  Printer,
  MessageSquare,
  Gift,
  CheckCircle,
} from "lucide-react";
import Button from "../../ui/components/Button";
import Modal from "../../ui/components/Modal";
import Input from "../../ui/components/Input";
import toast from "react-hot-toast";
import type { Client, Treatment, Staff } from "./POSSchema";

interface Transaction {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  discountAmount: number;
  tipsTotal: number;
  loyaltyPointsEarned: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  paymentMethod: string;
}

interface ReceiptAndNextAppointmentProps {
  transaction: Transaction;
  client: Client;
  treatments: Treatment[];
  staff: Staff[];
  onBookAppointment: (appointmentData: {
    clientId: string;
    treatmentId: string;
    datetimeISO: string;
    staffId?: string;
    notes?: string;
  }) => void;
  onNewSale: () => void;
  bookingAppointment?: boolean;
  onClose: () => void;
}

// Styled Components
const Container = styled.div`
  display: grid;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
`;

const SuccessHeader = styled.div`
  text-align: center;
  padding: 2rem 1rem;
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.green500};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  animation: scaleIn 0.4s ease-out;

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

const SuccessSubtitle = styled.p`
  font-size: 1.125rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin: 0 0 1rem 0;
`;

const TransactionId = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  font-family: "Courier New", monospace;
`;

const SectionGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadowSm};
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ReceiptList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const ReceiptRow = styled.div<{ $isTotal?: boolean }>`
  display: flex;
  justify-content: space-between;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.color.text};

  ${({ $isTotal, theme }) =>
    $isTotal &&
    `
    font-weight: 700;
    font-size: 1.125rem;
    padding-top: 0.75rem;
    border-top: 2px solid ${theme.color.border};
    color: ${theme.color.brand600};
  `}
`;

const LoyaltyCard = styled.div`
  padding: 1.25rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.brand500}20,
    ${({ theme }) => theme.color.brand600}20
  );
  border: 2px solid ${({ theme }) => theme.color.brand500};
  border-radius: ${({ theme }) => theme.radii.lg};
  text-align: center;
`;

const LoyaltyAmount = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.brand600};
  margin-bottom: 0.5rem;
`;

const LoyaltyLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const ReceiptActions = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;
`;

const ReceiptButton = styled.button`
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.grey100};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.text};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.color.brand50};
    border-color: ${({ theme }) => theme.color.brand500};
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const AppointmentPrompt = styled.div`
  padding: 2rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 2px solid ${({ theme }) => theme.color.brand500};
  border-radius: ${({ theme }) => theme.radii.lg};
  text-align: center;
`;

const PromptTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  margin: 0 0 0.75rem 0;
`;

const PromptSubtitle = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin: 0 0 1.5rem 0;
`;

const PromptActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const FormContainer = styled.div`
  display: grid;
  gap: 1.25rem;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.color.text};
`;

const Select = styled.select`
  width: 100%;
  min-height: 46px;
  padding: 0.8rem 1.2rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  box-shadow: ${({ theme }) => theme.shadowSm};
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  cursor: pointer;
  transition: box-shadow 0.12s ease, border-color 0.12s ease;
  box-sizing: border-box;

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.color.grey100};
  }
`;

const DateTimeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InfoBox = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 1px solid ${({ theme }) => theme.color.brand200};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 1.5rem;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

// Helper function to generate time slots
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 17; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 17 && m > 0) break;
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      slots.push(`${hour}:${minute}`);
    }
  }
  return slots;
}

export default function ReceiptAndNextAppointment({
  transaction,
  client,
  treatments,
  staff,
  onBookAppointment,
  onNewSale,
  bookingAppointment = false,
  onClose,
}: ReceiptAndNextAppointmentProps) {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    date: "",
    time: "",
    treatment: "",
    staff: "",
    notes: "",
  });

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Filter treatments that were actually treatments (not products)
  const availableTreatments = useMemo(() => {
    return treatments.filter((t) =>
      transaction.items.some(
        (item) => item.name.toLowerCase() === t.name.toLowerCase()
      )
    );
  }, [treatments, transaction.items]);

  const handleSendReceipt = useCallback(
    async (method: "email" | "print" | "sms") => {
      try {
        // In real app, call API to send receipt
        // await sendReceipt(transaction.id, method, client.email or client.phone);

        toast.success(
          `Receipt ${method === "print" ? "printed" : `sent via ${method}`}!`,
          {
            duration: 3000,
            position: "top-right",
          }
        );
      } catch (error) {
        toast.error(`Failed to send receipt via ${method}`, {
          duration: 4000,
          position: "top-right",
        });
      }
    },
    [transaction.id, client]
  );

  const handleOpenAppointmentModal = useCallback(() => {
    // Pre-fill with first treatment if available
    if (availableTreatments.length > 0) {
      setAppointmentData((prev) => ({
        ...prev,
        treatment: availableTreatments[0].id,
      }));
    }
    setShowAppointmentModal(true);
  }, [availableTreatments]);

  const handleCloseAppointmentModal = useCallback(() => {
    setShowAppointmentModal(false);
    setAppointmentData({
      date: "",
      time: "",
      treatment: "",
      staff: "",
      notes: "",
    });
  }, []);

  const handleAppointmentSubmit = useCallback(() => {
    // Validate required fields
    if (
      !appointmentData.date ||
      !appointmentData.time ||
      !appointmentData.treatment
    ) {
      toast.error("Please fill in all required fields", {
        duration: 4000,
        position: "top-right",
      });
      return;
    }

    // Build ISO datetime string
    const datetimeISO = `${appointmentData.date}T${appointmentData.time}:00`;

    onBookAppointment({
      clientId: client.id,
      treatmentId: appointmentData.treatment,
      datetimeISO,
      staffId: appointmentData.staff || undefined,
      notes: appointmentData.notes || undefined,
    });

    handleCloseAppointmentModal();
  }, [
    appointmentData,
    client.id,
    onBookAppointment,
    handleCloseAppointmentModal,
  ]);

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <Container>
      {/* Success Header */}
      <SuccessHeader>
        <SuccessIcon>
          <Check size={48} strokeWidth={3} />
        </SuccessIcon>
        <SuccessTitle>Payment Successful!</SuccessTitle>
        <SuccessSubtitle>Thank you for your payment</SuccessSubtitle>
        <TransactionId>Transaction ID: {transaction.id}</TransactionId>
      </SuccessHeader>

      {/* Receipt & Loyalty Cards */}
      <SectionGrid>
        <Card>
          <CardTitle>
            <CheckCircle size={18} />
            Receipt Summary
          </CardTitle>
          <ReceiptList>
            {transaction.items.map((item, idx) => (
              <ReceiptRow key={idx}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </ReceiptRow>
            ))}
            <ReceiptRow
              style={{
                marginTop: "0.5rem",
                paddingTop: "0.5rem",
                borderTop: "1px solid",
                borderColor: "inherit",
              }}
            >
              <span>Subtotal:</span>
              <span>${transaction.subtotal.toFixed(2)}</span>
            </ReceiptRow>
            {transaction.discountAmount > 0 && (
              <ReceiptRow>
                <span>Discount:</span>
                <span style={{ color: "#22c55e" }}>
                  -${transaction.discountAmount.toFixed(2)}
                </span>
              </ReceiptRow>
            )}
            <ReceiptRow>
              <span>Tax (15%):</span>
              <span>${transaction.tax.toFixed(2)}</span>
            </ReceiptRow>
            {transaction.tipsTotal > 0 && (
              <ReceiptRow>
                <span>Tips:</span>
                <span>${transaction.tipsTotal.toFixed(2)}</span>
              </ReceiptRow>
            )}
            <ReceiptRow $isTotal>
              <span>Total Paid:</span>
              <span>${transaction.total.toFixed(2)}</span>
            </ReceiptRow>
          </ReceiptList>

          <ReceiptActions>
            <ReceiptButton onClick={() => handleSendReceipt("email")}>
              <Mail size={20} />
              Email
            </ReceiptButton>
            <ReceiptButton onClick={() => handleSendReceipt("print")}>
              <Printer size={20} />
              Print
            </ReceiptButton>
            <ReceiptButton onClick={() => handleSendReceipt("sms")}>
              <MessageSquare size={20} />
              SMS
            </ReceiptButton>
          </ReceiptActions>
        </Card>

        <Card>
          <CardTitle>
            <Gift size={18} />
            Loyalty Points
          </CardTitle>
          <LoyaltyCard>
            <LoyaltyAmount>+{transaction.loyaltyPointsEarned}</LoyaltyAmount>
            <LoyaltyLabel>Points Earned</LoyaltyLabel>
          </LoyaltyCard>
          <div
            style={{
              marginTop: "1rem",
              textAlign: "center",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            New balance:{" "}
            <strong>
              {client.loyaltyPoints + transaction.loyaltyPointsEarned} points
            </strong>
          </div>
        </Card>
      </SectionGrid>

      {/* Book Next Appointment Prompt */}
      <AppointmentPrompt>
        <PromptTitle>Book Your Next Appointment?</PromptTitle>
        <PromptSubtitle>
          Schedule your next visit with {client.name} now
        </PromptSubtitle>
        <PromptActions>
          <Button
            variation="secondary"
            size="medium"
            onClick={onNewSale}
            style={{
              flex: 1,
              justifyContent: "center",
              minWidth: "160px",
            }}
          >
            <X size={20} />
            No Thanks
          </Button>
          <Button
            variation="primary"
            size="medium"
            onClick={handleOpenAppointmentModal}
            style={{
              flex: 1,
              justifyContent: "center",
              minWidth: "160px",
            }}
          >
            <Calendar size={20} />
            Book Appointment
          </Button>
        </PromptActions>
      </AppointmentPrompt>

      {/* Appointment Booking Modal */}
      <Modal
        isOpen={showAppointmentModal}
        onClose={handleCloseAppointmentModal}
        title="Book Next Appointment"
        size="md"
        ariaLabel="Book next appointment"
      >
        <InfoBox>
          <strong>Booking for:</strong> {client.name}
          <br />
          {client.email && (
            <>
              <strong>Email:</strong> {client.email}
              <br />
            </>
          )}
          {client.phone && (
            <>
              <strong>Phone:</strong> {client.phone}
            </>
          )}
        </InfoBox>

        <FormContainer>
          <FormField>
            <Label htmlFor="appointment-treatment">
              Treatment <span style={{ color: "#ef4444" }}>*</span>
            </Label>
            <Select
              id="appointment-treatment"
              value={appointmentData.treatment}
              onChange={(e) =>
                setAppointmentData((prev) => ({
                  ...prev,
                  treatment: e.target.value,
                }))
              }
            >
              <option value="">Select a treatment</option>
              {availableTreatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {treatment.name} ({treatment.durationMinutes} min - $
                  {treatment.price})
                </option>
              ))}
            </Select>
          </FormField>

          <DateTimeGrid>
            <FormField>
              <Label htmlFor="appointment-date">
                Date <span style={{ color: "#ef4444" }}>*</span>
              </Label>
              <Input
                type="date"
                id="appointment-date"
                value={appointmentData.date}
                onChange={(e) =>
                  setAppointmentData((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                min={minDate}
              />
            </FormField>

            <FormField>
              <Label htmlFor="appointment-time">
                Time <span style={{ color: "#ef4444" }}>*</span>
              </Label>
              <Select
                id="appointment-time"
                value={appointmentData.time}
                onChange={(e) =>
                  setAppointmentData((prev) => ({
                    ...prev,
                    time: e.target.value,
                  }))
                }
              >
                <option value="">Select time</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </Select>
            </FormField>
          </DateTimeGrid>

          <FormField>
            <Label htmlFor="appointment-staff">Staff (Optional)</Label>
            <Select
              id="appointment-staff"
              value={appointmentData.staff}
              onChange={(e) =>
                setAppointmentData((prev) => ({
                  ...prev,
                  staff: e.target.value,
                }))
              }
            >
              <option value="">Any available staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.role}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField>
            <Label htmlFor="appointment-notes">Notes (Optional)</Label>
            <Input
              type="text"
              id="appointment-notes"
              value={appointmentData.notes}
              onChange={(e) =>
                setAppointmentData((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder="Any special requests or preferences..."
            />
          </FormField>

          <ModalActions>
            <Button
              variation="secondary"
              onClick={handleCloseAppointmentModal}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Cancel
            </Button>
            <Button
              variation="primary"
              onClick={handleAppointmentSubmit}
              disabled={bookingAppointment}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Calendar size={18} />
              {bookingAppointment ? "Booking..." : "Book Appointment"}
            </Button>
          </ModalActions>
        </FormContainer>
      </Modal>
    </Container>
  );
}
