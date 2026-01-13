import React, { useMemo, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import SearchableSelect, {
  type SimpleOption,
} from "../../ui/components/SearchableSelect";
import styled from "styled-components";
import type { Client, Treatment, Staff } from "./api";
import { Plus, X, Clock } from "lucide-react";

export interface AppointmentFormValues {
  client: string;
  treatments: string[]; // Changed from single treatment to array
  staff?: string;
  datetimeLocal: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  values: AppointmentFormValues;
  onChange: (patch: Partial<AppointmentFormValues>) => void;
  onSubmit: () => void;
  submitting?: boolean;
  clients?: Client[];
  treatments?: Treatment[];
  staff?: Staff[];
}

// Styled Components
const Form = styled.form`
  display: grid;
  gap: 1.25rem;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};
`;

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.color.red500 || "#ef4444"};
  margin-left: 4px;
`;

const DateTimeGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
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
    background-color: ${({ theme }) => theme.color.grey100 || "#f3f4f6"};
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400 || "#9ca3af"};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const TreatmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const TreatmentRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

const TreatmentSelectWrapper = styled.div`
  flex: 1;
`;

const RemoveButton = styled.button`
  min-width: 46px;
  height: 46px;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.red500 || "#ef4444"};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.color.red100 || "#fee2e2"};
    border-color: ${({ theme }) => theme.color.red200 || "#fca5a5"};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const AddTreatmentButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 2px dashed ${({ theme }) => theme.color.border};
  background-color: transparent;
  color: ${({ theme }) => theme.color.brand600};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: all 0.12s ease;

  &:hover {
    background-color: ${({ theme }) => theme.color.brand50 || "#eff6ff"};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const TreatmentSummary = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.mutedText};

  &:last-child {
    padding-top: 0.5rem;
    border-top: 1px solid ${({ theme }) => theme.color.border};
    font-weight: 600;
    color: ${({ theme }) => theme.color.text};
  }
`;

const TimeSlot = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.color.mutedText};
  border: 1px solid ${({ theme }) => theme.color.border};

  svg {
    color: ${({ theme }) => theme.color.brand600};
  }
`;

// Helper Functions
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 9; h <= 17; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 17 && m > 0) break;
      times.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return times;
}

function splitDatetimeLocal(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };

  if (value.startsWith("T")) {
    return { date: "", time: value.slice(1, 6) };
  }

  if (value.includes("T")) {
    const [datePart, timePart] = value.split("T");
    return { date: datePart || "", time: timePart?.slice(0, 5) || "" };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { date: value, time: "" };
  }

  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };

    const year = parsed.getFullYear();
    const month = pad2(parsed.getMonth() + 1);
    const day = pad2(parsed.getDate());
    const hh = pad2(parsed.getHours());
    const mm = pad2(parsed.getMinutes());

    return { date: `${year}-${month}-${day}`, time: `${hh}:${mm}` };
  } catch {
    return { date: "", time: "" };
  }
}

function joinDateTimeLocal(date: string, time: string): string {
  if (!date && !time) return "";
  if (!date) return `T${time}`;
  if (!time) return date;
  return `${date}T${time}`;
}

function mapToSimpleOptions<T extends { id: string; name: string }>(
  items: T[]
): SimpleOption[] {
  return items.map((item) => ({
    id: item.id,
    label: item.name,
  }));
}

function mapStaffToSimpleOptions(
  items: Array<{ id: string; firstName: string; lastName: string }>
): SimpleOption[] {
  return items.map((item) => ({
    id: item.id,
    label: `${item.firstName} ${item.lastName}`,
  }));
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${pad2(minutes)} ${ampm}`;
}

// Component
export default function AppointmentModal({
  isOpen,
  onClose,
  values,
  onChange,
  onSubmit,
  submitting = false,
  clients = [],
  treatments = [],
  staff = [],
}: AppointmentModalProps) {
  const timeOptions = useMemo(() => generateTimeOptions(), []);
  const clientOptions = useMemo(() => mapToSimpleOptions(clients), [clients]);
  const treatmentOptions = useMemo(
    () => mapToSimpleOptions(treatments),
    [treatments]
  );
  const staffOptions = useMemo(() => mapStaffToSimpleOptions(staff), [staff]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      const { time: currentTime } = splitDatetimeLocal(values.datetimeLocal);
      const newDateTime = joinDateTimeLocal(newDate, currentTime);
      onChange({ datetimeLocal: newDateTime });
    },
    [onChange, values.datetimeLocal]
  );

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTime = e.target.value;
      const { date: currentDate } = splitDatetimeLocal(values.datetimeLocal);
      const newDateTime = joinDateTimeLocal(currentDate, newTime);
      onChange({ datetimeLocal: newDateTime });
    },
    [onChange, values.datetimeLocal]
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );

  const handleAddTreatment = useCallback(() => {
    onChange({ treatments: [...values.treatments, ""] });
  }, [onChange, values.treatments]);

  const handleRemoveTreatment = useCallback(
    (index: number) => {
      const newTreatments = values.treatments.filter((_, i) => i !== index);
      onChange({ treatments: newTreatments });
    },
    [onChange, values.treatments]
  );

  const handleTreatmentChange = useCallback(
    (index: number, treatmentId: string) => {
      const newTreatments = [...values.treatments];
      newTreatments[index] = treatmentId;
      onChange({ treatments: newTreatments });
    },
    [onChange, values.treatments]
  );

  // Calculate treatment schedule and totals
  const treatmentSchedule = useMemo(() => {
    if (!values.datetimeLocal || values.treatments.length === 0) {
      return { slots: [], totalDuration: 0, endTime: null };
    }

    const startDate = new Date(values.datetimeLocal);
    if (isNaN(startDate.getTime())) {
      return { slots: [], totalDuration: 0, endTime: null };
    }

    let currentTime = new Date(startDate);
    let totalDuration = 0;
    const slots: Array<{
      treatmentName: string;
      startTime: Date;
      endTime: Date;
      duration: number;
    }> = [];

    values.treatments.forEach((treatmentId) => {
      if (!treatmentId) return;

      const treatment = treatments.find((t) => t.id === treatmentId);
      if (!treatment) return;

      const duration = treatment.durationMinutes || 60;
      const endTime = new Date(currentTime.getTime() + duration * 60 * 1000);

      slots.push({
        treatmentName: treatment.name,
        startTime: new Date(currentTime),
        endTime: endTime,
        duration: duration,
      });

      totalDuration += duration;
      currentTime = endTime;
    });

    return {
      slots,
      totalDuration,
      endTime: slots.length > 0 ? slots[slots.length - 1].endTime : null,
    };
  }, [values.datetimeLocal, values.treatments, treatments]);

  const isFormValid = useMemo(() => {
    return (
      values.client &&
      values.treatments.length > 0 &&
      values.treatments.every((t) => t) &&
      values.datetimeLocal
    );
  }, [values]);

  const { date, time } = useMemo(() => {
    return splitDatetimeLocal(values.datetimeLocal);
  }, [values.datetimeLocal]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Appointment"
      size="md"
      ariaLabel="Create new appointment"
    >
      <Form onSubmit={handleFormSubmit}>
        {/* Client Field */}
        <FormField>
          <Label htmlFor="appointment-client">
            Client
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <SearchableSelect
            id="appointment-client"
            options={clientOptions}
            value={values.client}
            onChange={(val) => onChange({ client: val })}
            placeholder="Search for a client..."
            allowFreeInput={false}
            ariaLabel="Select client"
            required
          />
        </FormField>

        {/* Treatments Field */}
        <FormField>
          <Label>
            Treatments
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <TreatmentsList>
            {values.treatments.map((treatmentId, index) => (
              <TreatmentRow key={index}>
                <TreatmentSelectWrapper>
                  <SearchableSelect
                    id={`appointment-treatment-${index}`}
                    options={treatmentOptions}
                    value={treatmentId}
                    onChange={(val) => handleTreatmentChange(index, val)}
                    placeholder="Search for a treatment..."
                    allowFreeInput={false}
                    ariaLabel={`Select treatment ${index + 1}`}
                    required
                  />
                </TreatmentSelectWrapper>
                <RemoveButton
                  type="button"
                  onClick={() => handleRemoveTreatment(index)}
                  disabled={values.treatments.length === 1}
                  aria-label="Remove treatment"
                >
                  <X size={18} />
                </RemoveButton>
              </TreatmentRow>
            ))}
            <AddTreatmentButton type="button" onClick={handleAddTreatment}>
              <Plus size={18} />
              Add Another Treatment
            </AddTreatmentButton>
          </TreatmentsList>
        </FormField>

        {/* Treatment Schedule Summary */}
        {treatmentSchedule.slots.length > 0 && (
          <TreatmentSummary>
            {treatmentSchedule.slots.map((slot, index) => (
              <SummaryRow key={index}>
                <span>{slot.treatmentName}</span>
                <TimeSlot>
                  <Clock size={14} />
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  <span style={{ marginLeft: "0.25rem", opacity: 0.7 }}>
                    ({slot.duration} min)
                  </span>
                </TimeSlot>
              </SummaryRow>
            ))}
            <SummaryRow>
              <span>Total Duration</span>
              <span>{treatmentSchedule.totalDuration} minutes</span>
            </SummaryRow>
          </TreatmentSummary>
        )}

        {/* Staff Field */}
        <FormField>
          <Label htmlFor="appointment-staff">Staff (Optional)</Label>
          <SearchableSelect
            id="appointment-staff"
            options={staffOptions}
            value={values.staff || ""}
            onChange={(val) => onChange({ staff: val })}
            placeholder="Select staff member..."
            allowFreeInput={false}
            ariaLabel="Select staff member"
          />
        </FormField>

        {/* Date & Time Fields */}
        <DateTimeGrid>
          <FormField>
            <Label htmlFor="appointment-date">
              Start Date
              <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Input
              id="appointment-date"
              type="date"
              value={date}
              onChange={handleDateChange}
              required
              aria-label="Select appointment date"
              min={new Date().toISOString().split("T")[0]}
            />
          </FormField>

          <FormField>
            <Label htmlFor="appointment-time">
              Start Time
              <RequiredIndicator>*</RequiredIndicator>
            </Label>
            <Select
              id="appointment-time"
              value={time}
              onChange={handleTimeChange}
              required
              aria-label="Select appointment time"
            >
              <option value="">Select time</option>
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
        </DateTimeGrid>

        {/* Form Actions */}
        <Actions>
          <Button
            variation="secondary"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variation="primary"
            type="submit"
            disabled={submitting || !isFormValid}
          >
            {submitting
              ? "Booking..."
              : `Book ${
                  values.treatments.length > 1
                    ? `${values.treatments.length} Treatments`
                    : "Appointment"
                }`}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
