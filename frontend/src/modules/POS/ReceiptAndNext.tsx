import React, { useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import {
  CheckCircle,
  Calendar,
  Mail,
  Printer,
  MessageSquare,
  Gift,
  X,
  Clock,
} from "lucide-react";

import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import Modal from "../../ui/components/Modal";
import Card from "../../ui/components/Card";

// ============================================================================
// TYPES
// ============================================================================

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

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  loyaltyPoints: number;
}

interface Treatment {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  category?: string;
  isActive: boolean;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  specialties?: string[];
  available: boolean;
}

interface ReceiptAndNextProps {
  transaction: Transaction;
  client: Client;
  treatments: any[];
  staff: Staff[];
  onBookAppointment: (appointmentData: {
    clientId: string;
    treatmentId: string;
    datetimeISO: string;
    staffId?: string;
    notes?: string;
  }) => void;
  onNewSale: () => void;
  onClose: () => void;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

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
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.green500},
    ${({ theme }) => theme.color.green500}
  );
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  animation: scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 25px -5px rgba(34, 197, 94, 0.4);

  @keyframes scaleIn {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
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
  font-weight: 600;
`;

const SectionGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SectionCard = styled(Card)`
  padding: 1.5rem;
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
  padding: ${({ $isTotal }) => ($isTotal ? "0.75rem 0 0 0" : "0")};
  border-top: ${({ $isTotal, theme }) =>
    $isTotal ? `2px solid ${theme.color.border}` : "none"};
  margin-top: ${({ $isTotal }) => ($isTotal ? "0.5rem" : "0")};

  ${({ $isTotal, theme }) =>
    $isTotal &&
    `
    font-weight: 700;
    font-size: 1.125rem;
    color: ${theme.color.brand600};
  `}
`;

const LoyaltyCard = styled.div`
  padding: 1.5rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.brand100}40,
    ${({ theme }) => theme.color.brand200}40
  );
  border: 2px solid ${({ theme }) => theme.color.brand300};
  border-radius: ${({ theme }) => theme.radii.lg};
  text-align: center;
`;

const LoyaltyAmount = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.brand600};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const LoyaltyLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const LoyaltyBalance = styled.div`
  margin-top: 1rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};
  font-weight: 500;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.color.brand600};
  }
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ theme }) => theme.shadowSm};

  &:hover {
    background: ${({ theme }) => theme.color.brand50};
    border-color: ${({ theme }) => theme.color.brand500};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadowMd};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const AppointmentPrompt = styled(Card)`
  padding: 2rem;
  text-align: center;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.brand50},
    ${({ theme }) => theme.color.brand100}40
  );
  border: 2px solid ${({ theme }) => theme.color.brand300};
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

  span {
    color: ${({ theme }) => theme.color.red500};
  }
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

  strong {
    font-weight: 700;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

export default function ReceiptAndNext({
  transaction,
  client,
  treatments,
  staff,
  onBookAppointment,
  onNewSale,
  onClose,
}: ReceiptAndNextProps) {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    date: "",
    time: "",
    treatment: "",
    staff: "",
    notes: "",
  });

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const activeTreatments = useMemo(
    () => treatments.filter((t) => t.isActive),
    [treatments]
  );

  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const handleSendReceipt = useCallback(
    async (method: "email" | "print" | "sms") => {
      // Simulate sending receipt
      console.log(`Sending receipt via ${method} to:`, client);
      alert(`Receipt would be sent via ${method}!`);
    },
    [client]
  );

  const handleOpenAppointmentModal = useCallback(() => {
    if (activeTreatments.length > 0) {
      setAppointmentData((prev) => ({
        ...prev,
        treatment: activeTreatments[0].id,
      }));
    }
    setShowAppointmentModal(true);
  }, [activeTreatments]);

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
    if (
      !appointmentData.date ||
      !appointmentData.time ||
      !appointmentData.treatment
    ) {
      alert("Please fill in all required fields");
      return;
    }

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

  return (
    <Container>
      {/* Success Header */}
      <SuccessHeader>
        <SuccessIcon>
          <CheckCircle size={48} strokeWidth={3} />
        </SuccessIcon>
        <SuccessTitle>Payment Successful!</SuccessTitle>
        <SuccessSubtitle>Thank you for your payment</SuccessSubtitle>
        <TransactionId>Transaction ID: {transaction.id}</TransactionId>
      </SuccessHeader>

      {/* Receipt & Loyalty Cards */}
      <SectionGrid>
        <SectionCard>
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
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <span>Subtotal:</span>
              <span>${transaction.subtotal.toFixed(2)}</span>
            </ReceiptRow>
            {transaction.discountAmount > 0 && (
              <ReceiptRow>
                <span>Discount:</span>
                <span style={{ color: "var(--color-green500)" }}>
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
        </SectionCard>

        <SectionCard>
          <CardTitle>
            <Gift size={18} />
            Loyalty Points
          </CardTitle>
          <LoyaltyCard>
            <LoyaltyAmount>
              <Gift size={32} />+{transaction.loyaltyPointsEarned}
            </LoyaltyAmount>
            <LoyaltyLabel>Points Earned</LoyaltyLabel>
            <LoyaltyBalance>
              New balance:{" "}
              <strong>
                {client.loyaltyPoints + transaction.loyaltyPointsEarned} points
              </strong>
            </LoyaltyBalance>
          </LoyaltyCard>
        </SectionCard>
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
            size="large"
            onClick={onNewSale}
            style={{ flex: 1, justifyContent: "center", minWidth: "160px" }}
          >
            <X size={20} />
            No Thanks
          </Button>
          <Button
            variation="primary"
            size="large"
            onClick={handleOpenAppointmentModal}
            style={{ flex: 1, justifyContent: "center", minWidth: "160px" }}
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
          {client.email && (
            <>
              <br />
              <strong>Email:</strong> {client.email}
            </>
          )}
          {client.phone && (
            <>
              <br />
              <strong>Phone:</strong> {client.phone}
            </>
          )}
        </InfoBox>

        <FormContainer>
          <FormField>
            <Label htmlFor="appointment-treatment">
              Treatment <span>*</span>
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
              {activeTreatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {treatment.name} ({treatment.durationMinutes} min - $
                  {treatment.price.toFixed(2)})
                </option>
              ))}
            </Select>
          </FormField>

          <DateTimeGrid>
            <FormField>
              <Label htmlFor="appointment-date">
                Date <span>*</span>
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
                Time <span>*</span>
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
              size="medium"
              onClick={handleCloseAppointmentModal}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Cancel
            </Button>
            <Button
              variation="primary"
              size="medium"
              onClick={handleAppointmentSubmit}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Calendar size={18} />
              Book Appointment
            </Button>
          </ModalActions>
        </FormContainer>
      </Modal>
    </Container>
  );
}
