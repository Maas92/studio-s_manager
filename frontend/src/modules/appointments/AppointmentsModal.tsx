import React, { useMemo, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import SearchableSelect, {
  type SimpleOption,
} from "../../ui/components/SearchableSelect";
import styled from "styled-components";
import type { Client, Treatment, Staff } from "./api";

export interface AppointmentFormValues {
  client: string;
  treatment: string;
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

  // Handle partial values (date only or time only)
  if (value.startsWith("T")) {
    // Time only case
    return { date: "", time: value.slice(1, 6) };
  }

  if (value.includes("T")) {
    const [datePart, timePart] = value.split("T");
    return { date: datePart || "", time: timePart?.slice(0, 5) || "" };
  }

  // Just a date, no time
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
  // Allow joining even if one part is missing - the form will handle validation
  if (!date && !time) return "";
  if (!date) return `T${time}`; // Time only
  if (!time) return date; // Date only
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

  const staffOptions = useMemo(() => mapToSimpleOptions(staff), [staff]);

  // CRITICAL FIX: Don't use memoized date/time in callbacks
  // Always split from values.datetimeLocal directly to avoid stale closures
  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      console.log("=== DATE CHANGE ===");
      console.log("New date selected:", newDate);
      console.log("Current datetimeLocal:", values.datetimeLocal);

      // Get current time by splitting datetimeLocal (or empty if not set)
      const { time: currentTime } = splitDatetimeLocal(values.datetimeLocal);
      console.log("Current time extracted:", currentTime);

      // Join new date with current time (even if time is empty)
      const newDateTime = joinDateTimeLocal(newDate, currentTime);
      console.log("New datetime to save:", newDateTime);

      // IMPORTANT: Save the partial datetime even if time isn't selected yet
      onChange({ datetimeLocal: newDateTime });
    },
    [onChange, values.datetimeLocal]
  );

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTime = e.target.value;
      console.log("=== TIME CHANGE ===");
      console.log("New time selected:", newTime);
      console.log("Current datetimeLocal:", values.datetimeLocal);

      // Get current date by splitting datetimeLocal (or empty if not set)
      const { date: currentDate } = splitDatetimeLocal(values.datetimeLocal);
      console.log("Current date extracted:", currentDate);

      // Join current date with new time (even if date isn't selected yet)
      const newDateTime = joinDateTimeLocal(currentDate, newTime);
      console.log("New datetime to save:", newDateTime);

      // IMPORTANT: Save the partial datetime even if date isn't selected yet
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

  const isFormValid = useMemo(
    () => values.client && values.treatment && values.datetimeLocal,
    [values]
  );

  // Split datetimeLocal for display in inputs
  const { date, time } = useMemo(() => {
    const result = splitDatetimeLocal(values.datetimeLocal);
    console.log("Rendering with date:", result.date, "time:", result.time);
    return result;
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

        {/* Treatment Field */}
        <FormField>
          <Label htmlFor="appointment-treatment">
            Treatment
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <SearchableSelect
            id="appointment-treatment"
            options={treatmentOptions}
            value={values.treatment}
            onChange={(val) => onChange({ treatment: val })}
            placeholder="Search for a treatment..."
            allowFreeInput={false}
            ariaLabel="Select treatment"
            required
          />
        </FormField>

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
              Date
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
              Time
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
            {submitting ? "Booking..." : "Book Appointment"}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
