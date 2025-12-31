import React, { useMemo, useCallback, useState, useEffect } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import SearchableSelect, {
  type SimpleOption,
} from "../../ui/components/SearchableSelect";
import styled from "styled-components";
import type { Appointment, Client, Treatment, Staff } from "./api";
import { Trash2, Edit2, Save, X, User, Calendar, Clock } from "lucide-react";

export interface AppointmentDetailFormValues {
  client: string;
  treatment: string;
  staff?: string;
  datetimeLocal: string;
  status: string;
  notes?: string;
}

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdate?: (id: string, values: Partial<AppointmentDetailFormValues>) => void;
  onDelete?: (id: string) => void;
  updating?: boolean;
  deleting?: boolean;
  clients?: Client[];
  treatments?: Treatment[];
  staff?: Staff[];
  canEdit?: boolean;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const InfoCard = styled.div`
  padding: 1.25rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  display: grid;
  gap: 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;

  svg {
    color: ${({ theme }) => theme.color.brand600};
    flex-shrink: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  min-width: 80px;
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.color.mutedText};
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400};
  }

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.color.grey100 || "#f3f4f6"};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
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
  resize: vertical;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400};
  }

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.color.grey100 || "#f3f4f6"};
  }

  &::placeholder {
    color: ${({ theme }) => theme.color.mutedText};
    opacity: 0.7;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const LeftActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const RightActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Badge = styled.span<{
  $variant: "confirmed" | "pending" | "cancelled" | "completed";
}>`
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case "confirmed":
        return theme.color.green100 || "#dcfce7";
      case "completed":
        return theme.color.blue100 || "#dbeafe";
      case "pending":
        return theme.color.yellow100 || "#fef3c7";
      case "cancelled":
        return theme.color.red100 || "#fee2e2";
      default:
        return theme.color.grey100 || "#f3f4f6";
    }
  }};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case "confirmed":
        return theme.color.green700 || "#15803d";
      case "completed":
        return theme.color.blue500 || "#1d4ed8";
      case "pending":
        return theme.color.yellow700 || "#a16207";
      case "cancelled":
        return theme.color.red600 || "#b91c1c";
      default:
        return theme.color.grey700 || "#374151";
    }
  }};
  border-color: ${({ $variant, theme }) => {
    switch ($variant) {
      case "confirmed":
        return theme.color.green200 || "#bbf7d0";
      case "completed":
        return theme.color.blue100 || "#bfdbfe";
      case "pending":
        return theme.color.yellow200 || "#fef08a";
      case "cancelled":
        return theme.color.red200 || "#fecaca";
      default:
        return theme.color.grey200 || "#e5e7eb";
    }
  }};
`;

// Helper Functions
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
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

function mapToSimpleOptions<T extends { id: string; firstName: string }>(
  items: T[]
): SimpleOption[] {
  return items.map((item) => ({
    id: item.id,
    label: item.firstName,
  }));
}

export default function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  onUpdate,
  onDelete,
  updating = false,
  deleting = false,
  clients = [],
  treatments = [],
  staff = [],
  canEdit = true,
}: AppointmentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<AppointmentDetailFormValues>({
    client: "",
    treatment: "",
    staff: "",
    datetimeLocal: "",
    status: "confirmed",
    notes: "",
  });

  const timeOptions = useMemo(() => generateTimeOptions(), []);
  const clientOptions = useMemo(() => mapToSimpleOptions(clients), [clients]);
  const treatmentOptions = useMemo(
    () => mapToSimpleOptions(treatments),
    [treatments]
  );
  const staffOptions = useMemo(() => mapToSimpleOptions(staff), [staff]);

  useEffect(() => {
    if (appointment) {
      setFormValues({
        client: appointment.clientId,
        treatment: appointment.treatmentId,
        staff: appointment.staffId || "",
        datetimeLocal: appointment.datetimeISO,
        status: appointment.status || "confirmed",
        notes: appointment.notes || "",
      });
      setIsEditing(false);
    }
  }, [appointment]);

  const { date, time } = useMemo(
    () => splitDatetimeLocal(formValues.datetimeLocal),
    [formValues.datetimeLocal]
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      const currentParts = splitDatetimeLocal(formValues.datetimeLocal);
      const newDateTime = joinDateTimeLocal(newDate, currentParts.time);
      setFormValues((prev) => ({ ...prev, datetimeLocal: newDateTime }));
    },
    [formValues.datetimeLocal]
  );

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTime = e.target.value;
      const currentParts = splitDatetimeLocal(formValues.datetimeLocal);
      const newDateTime = joinDateTimeLocal(currentParts.date, newTime);
      setFormValues((prev) => ({ ...prev, datetimeLocal: newDateTime }));
    },
    [formValues.datetimeLocal]
  );

  const handleSave = useCallback(() => {
    if (!appointment) return;

    const updates: Partial<AppointmentDetailFormValues> = {
      datetimeLocal: new Date(formValues.datetimeLocal).toISOString(),
      status: formValues.status,
      notes: formValues.notes,
    };

    if (formValues.client !== appointment.clientId) {
      updates.client = formValues.client;
    }
    if (formValues.treatment !== appointment.treatmentId) {
      updates.treatment = formValues.treatment;
    }
    if (formValues.staff !== appointment.staffId) {
      updates.staff = formValues.staff;
    }

    onUpdate?.(appointment.id, updates);
    setIsEditing(false);
  }, [appointment, formValues, onUpdate]);

  const handleDelete = useCallback(() => {
    if (!appointment) return;
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      onDelete?.(appointment.id);
    }
  }, [appointment, onDelete]);

  const handleCancel = useCallback(() => {
    if (!appointment) return;
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      onUpdate?.(appointment.id, { status: "cancelled" });
    }
    setIsEditing(false);
  }, [appointment, onUpdate]);

  if (!appointment) return null;

  const clientName =
    clients.find((c) => c.id === formValues.client)?.name ||
    appointment.clientName;
  const treatmentName =
    treatments.find((t) => t.id === formValues.treatment)?.name ||
    appointment.treatmentName;
  const staffName =
    staff.find((s) => s.id === formValues.staff)?.firstName ||
    appointment.staffName;

  const statusVariant = (
    ["confirmed", "pending", "cancelled", "completed"].includes(
      formValues.status
    )
      ? formValues.status
      : "pending"
  ) as "confirmed" | "pending" | "cancelled" | "completed";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          Appointment Details
          <Badge $variant={statusVariant}>{formValues.status}</Badge>
        </div>
      }
      size="md"
      ariaLabel="Appointment details"
    >
      <Content>
        {!isEditing && (
          <InfoCard>
            <InfoRow>
              <User size={18} />
              <InfoLabel>Client:</InfoLabel>
              <InfoValue>{clientName || appointment.clientId}</InfoValue>
            </InfoRow>
            <InfoRow>
              <Calendar size={18} />
              <InfoLabel>Date:</InfoLabel>
              <InfoValue>
                {new Date(appointment.datetimeISO).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <Clock size={18} />
              <InfoLabel>Time:</InfoLabel>
              <InfoValue>
                {new Date(appointment.datetimeISO).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </InfoValue>
            </InfoRow>
          </InfoCard>
        )}

        {isEditing ? (
          <>
            <FormField>
              <Label htmlFor="detail-client">Client</Label>
              <SearchableSelect
                id="detail-client"
                options={clientOptions}
                value={formValues.client}
                onChange={(val) =>
                  setFormValues((prev) => ({ ...prev, client: val }))
                }
                placeholder="Search for a client..."
                allowFreeInput={false}
              />
            </FormField>

            <FormField>
              <Label htmlFor="detail-treatment">Treatment</Label>
              <SearchableSelect
                id="detail-treatment"
                options={treatmentOptions}
                value={formValues.treatment}
                onChange={(val) =>
                  setFormValues((prev) => ({ ...prev, treatment: val }))
                }
                placeholder="Search for a treatment..."
                allowFreeInput={false}
              />
            </FormField>

            <FormField>
              <Label htmlFor="detail-staff">Staff</Label>
              <SearchableSelect
                id="detail-staff"
                options={staffOptions}
                value={formValues.staff || ""}
                onChange={(val) =>
                  setFormValues((prev) => ({ ...prev, staff: val }))
                }
                placeholder="Select staff member..."
                allowFreeInput={false}
              />
            </FormField>

            <DateTimeGrid>
              <FormField>
                <Label htmlFor="detail-date">Date</Label>
                <Input
                  id="detail-date"
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split("T")[0]}
                />
              </FormField>

              <FormField>
                <Label htmlFor="detail-time">Time</Label>
                <Select
                  id="detail-time"
                  value={time}
                  onChange={handleTimeChange}
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

            <FormField>
              <Label htmlFor="detail-status">Status</Label>
              <Select
                id="detail-status"
                value={formValues.status}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </FormField>
          </>
        ) : (
          <>
            <FormField>
              <Label>Treatment</Label>
              <InfoValue style={{ fontSize: "1rem", padding: "0.5rem 0" }}>
                {treatmentName || appointment.treatmentId}
              </InfoValue>
            </FormField>

            <FormField>
              <Label>Staff</Label>
              <InfoValue style={{ fontSize: "1rem", padding: "0.5rem 0" }}>
                {staffName || "Not assigned"}
              </InfoValue>
            </FormField>
          </>
        )}

        <FormField>
          <Label htmlFor="detail-notes">Notes</Label>
          {isEditing ? (
            <TextArea
              id="detail-notes"
              value={formValues.notes || ""}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add notes about this appointment..."
            />
          ) : (
            <InfoValue style={{ fontSize: "1rem", padding: "0.5rem 0" }}>
              {formValues.notes || "No notes"}
            </InfoValue>
          )}
        </FormField>

        <Actions>
          <LeftActions>
            {!isEditing && canEdit && (
              <Button
                variation="danger"
                type="button"
                onClick={handleCancel}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? "Cancelling..." : "Cancel"}
              </Button>
            )}
          </LeftActions>

          <RightActions>
            {isEditing ? (
              <>
                <Button
                  variation="secondary"
                  type="button"
                  onClick={handleCancel}
                >
                  <X size={16} />
                  Cancel
                </Button>
                <Button
                  variation="primary"
                  type="button"
                  onClick={handleSave}
                  disabled={updating}
                >
                  <Save size={16} />
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variation="secondary" type="button" onClick={onClose}>
                  Close
                </Button>
                {canEdit && (
                  <Button
                    variation="primary"
                    type="button"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 size={16} />
                    Edit
                  </Button>
                )}
              </>
            )}
          </RightActions>
        </Actions>
      </Content>
    </Modal>
  );
}
