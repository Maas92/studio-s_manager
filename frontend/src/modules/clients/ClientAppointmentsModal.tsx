import React, { useMemo } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import styled from "styled-components";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { Client } from "./api";
import type { Appointment } from "../appointments/AppointmentsSchema";

interface ClientAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  appointments: Appointment[];
  onCreateAppointment?: (clientId: string, clientName: string) => void;
}

// ─── Styled Components ────────────────────────────────────────────────────────

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.mutedText};
`;

const SectionCount = styled.span`
  margin-left: auto;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: ${({ theme }) => theme.radii.round};
  background: ${({ theme }) => theme.color.grey100};
  color: ${({ theme }) => theme.color.mutedText};
`;

const AppointmentList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const statusConfig = {
  completed: {
    color: "#15803d",
    bg: "#dcfce7",
    Icon: CheckCircle,
    label: "Completed",
  },
  cancelled: {
    color: "#b91c1c",
    bg: "#fee2e2",
    Icon: XCircle,
    label: "Cancelled",
  },
  "no-show": {
    color: "#b45309",
    bg: "#fef3c7",
    Icon: AlertCircle,
    label: "No-show",
  },
  scheduled: {
    color: "#1d4ed8",
    bg: "#dbeafe",
    Icon: Clock,
    label: "Scheduled",
  },
  confirmed: {
    color: "#1d4ed8",
    bg: "#dbeafe",
    Icon: Calendar,
    label: "Confirmed",
  },
} as const;

function getStatusConfig(status: string | undefined) {
  return (
    statusConfig[status as keyof typeof statusConfig] ?? {
      color: "#6b7280",
      bg: "#f3f4f6",
      Icon: Calendar,
      label: status,
    }
  );
}

const AppointmentItem = styled.li<{ $isUpcoming: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ $isUpcoming, theme }) =>
    $isUpcoming ? theme.color.blue100 : theme.color.panel};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ $isUpcoming, theme }) =>
      $isUpcoming ? theme.color.blue100 : theme.color.grey50 || "#f9fafb"};
  }
`;

const DateBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
  text-align: center;
`;

const DateMonth = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedText};
  letter-spacing: 0.05em;
`;

const DateDay = styled.span`
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  color: ${({ theme }) => theme.color.text};
`;

const DateYear = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Divider = styled.div`
  width: 1px;
  height: 40px;
  background: ${({ theme }) => theme.color.border};
  flex-shrink: 0;
`;

const ApptDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const ApptService = styled.div`
  font-weight: 600;
  font-size: 1.2rem;
  color: ${({ theme }) => theme.color.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ApptMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.color.mutedText};

  svg {
    flex-shrink: 0;
  }
`;

const StatusBadge = styled.div<{ $color: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  flex-shrink: 0;
`;

const EmptyMessage = styled.div`
  padding: 1.25rem;
  text-align: center;
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.9rem;
  border: 1px dashed ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientAppointmentsModal({
  isOpen,
  onClose,
  client,
  appointments,
  onCreateAppointment,
}: ClientAppointmentsModalProps) {
  const { upcoming, past } = useMemo(() => {
    if (!client) return { upcoming: [], past: [] };

    const clientAppts = appointments
      .filter((a) => a.clientId === client.id)
      .sort(
        (a, b) =>
          new Date(b.datetimeISO).getTime() - new Date(a.datetimeISO).getTime(),
      );

    const now = Date.now();
    return {
      upcoming: clientAppts
        .filter((a) => new Date(a.datetimeISO).getTime() >= now)
        .reverse(), // chronological for upcoming
      past: clientAppts.filter((a) => new Date(a.datetimeISO).getTime() < now),
    };
  }, [client, appointments]);

  if (!client) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Appointments — ${client.name}`}
      size="lg"
      ariaLabel="Client appointments history"
    >
      <Content>
        {/* Upcoming */}
        <Section>
          <SectionHeader>
            <Calendar size={15} color="#1d4ed8" />
            <SectionTitle>Upcoming</SectionTitle>
            <SectionCount>{upcoming.length}</SectionCount>
          </SectionHeader>

          {upcoming.length === 0 ? (
            <EmptyMessage>No upcoming appointments</EmptyMessage>
          ) : (
            <AppointmentList>
              {upcoming.map((appt) => (
                <AppointmentRow key={appt.id} appt={appt} isUpcoming />
              ))}
            </AppointmentList>
          )}
        </Section>

        {/* Past */}
        <Section>
          <SectionHeader>
            <Clock size={15} color="#6b7280" />
            <SectionTitle>Past</SectionTitle>
            <SectionCount>{past.length}</SectionCount>
          </SectionHeader>

          {past.length === 0 ? (
            <EmptyMessage>No past appointments</EmptyMessage>
          ) : (
            <AppointmentList>
              {past.map((appt) => (
                <AppointmentRow key={appt.id} appt={appt} isUpcoming={false} />
              ))}
            </AppointmentList>
          )}
        </Section>

        <Footer>
          <Button variation="secondary" type="button" onClick={onClose}>
            Close
          </Button>
          {onCreateAppointment && (
            <Button
              variation="primary"
              type="button"
              onClick={() => {
                onClose();
                onCreateAppointment(client.id, client.name);
              }}
            >
              <Calendar size={16} />
              New Appointment
            </Button>
          )}
        </Footer>
      </Content>
    </Modal>
  );
}

// ─── Row sub-component ────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  isUpcoming,
}: {
  appt: Appointment;
  isUpcoming: boolean;
}) {
  const date = new Date(appt.datetimeISO);
  const { color, bg, Icon, label } = getStatusConfig(appt.status);

  return (
    <AppointmentItem $isUpcoming={isUpcoming}>
      <DateBlock>
        <DateMonth>
          {date.toLocaleDateString("en-US", { month: "short" })}
        </DateMonth>
        <DateDay>{date.getDate()}</DateDay>
        <DateYear>{date.getFullYear()}</DateYear>
      </DateBlock>

      <Divider />

      <ApptDetails>
        <ApptService>
          {appt.treatmentName ?? appt.treatmentId ?? "Appointment"}
        </ApptService>
        <ApptMeta>
          <Clock size={12} />
          {date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          {appt.duration && <> &middot; {appt.duration} min</>}
          {appt.price != null && appt.price > 0 && (
            <> &middot; ${appt.price.toFixed(2)}</>
          )}
        </ApptMeta>
      </ApptDetails>

      <StatusBadge $color={color} $bg={bg}>
        <Icon size={12} />
        {label}
      </StatusBadge>
    </AppointmentItem>
  );
}
