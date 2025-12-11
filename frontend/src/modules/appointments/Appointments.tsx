import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import PageHeader from "../../ui/components/PageHeader";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import Calendar from "../../ui/components/Calendar";
import WeekCalendar from "../../ui/components/WeekCalendar";
import AppointmentModal, {
  type AppointmentFormValues,
} from "./AppointmentsModal";
import AppointmentDetailModal, {
  type AppointmentDetailFormValues,
} from "./AppointmentsDetailModal";

import { useAppointments } from "./useAppointments";
import { useClients } from "../clients/useClient";
import { useTreatments } from "../treatments/useTreatments";
import { useStaff } from "../staff/useStaff";

import { type Appointment } from "./AppointmentsSchema";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem;
  background: ${({ theme }) => theme.color.grey100 || "#f3f4f6"};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const ViewButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 0.75rem;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.color.panel : "transparent"};
  color: ${({ theme }) => theme.color.text};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  display: flex;
  gap: 0.5rem;
  align-items: center;

  &:hover {
    background: ${({ theme }) => theme.color.panel};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

// initial values used by appointment modal form
const INITIAL_FORM_STATE: AppointmentFormValues = {
  client: "",
  treatment: "",
  staff: "",
  datetimeLocal: "",
};

type ViewMode = "week" | "month";

export default function Appointments() {
  const queryClient = useQueryClient();
  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useAppointments();
  const { listQuery: clientsQuery } = useClients();
  const { listQuery: treatmentsQuery } = useTreatments();
  const { listQuery: staffQuery } = useStaff();

  const appointments = listQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const treatments = treatmentsQuery.data ?? [];
  const staff = staffQuery.data ?? [];

  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [formValues, setFormValues] =
    useState<AppointmentFormValues>(INITIAL_FORM_STATE);

  // transform for calendar
  const calendarEvents = useMemo(() => {
    return (appointments || []).map((apt) => {
      const start = new Date(apt.datetimeISO);
      const durationMins =
        treatments.find((t) => t.id === apt.treatmentId)?.durationMinutes ?? 60;
      const end = new Date(start.getTime() + durationMins * 60 * 1000);
      return {
        id: apt.id,
        title: `${apt.clientName ?? apt.clientId} — ${apt.treatmentName ?? ""}`,
        startTime: start,
        endTime: end,
        data: apt,
      };
    });
  }, [appointments, treatments]);

  const handleOpenCreate = useCallback(() => {
    setFormValues(INITIAL_FORM_STATE);
    setShowCreateModal(true);
  }, []);

  const handleSubmitCreate = useCallback(async () => {
    // validation done in create mutation or upstream; we just map form to api payload
    try {
      await createMutation.mutateAsync({
        clientId: formValues.client,
        treatmentId: formValues.treatment,
        staffId: formValues.staff || undefined,
        datetimeISO: new Date(formValues.datetimeLocal).toISOString(),
      });
      // create mutation onSuccess already invalidates queries via the hook
    } catch (err: any) {
      // handled in mutation onError; but keep a fallback
      toast.error(err?.message ?? "Failed to create appointment");
    }
  }, [createMutation, formValues]);

  const handleEventClick = useCallback((ev: any) => {
    setSelectedAppointment(ev.data as Appointment);
    setShowDetailModal(true);
  }, []);

  const handleUpdate = useCallback(
    (
      id: string,
      updates: Partial<AppointmentFormValues | AppointmentDetailFormValues>
    ) => {
      const payload: any = {};
      if ((updates as any).datetimeLocal)
        payload.datetimeISO = new Date(
          (updates as any).datetimeLocal
        ).toISOString();
      if ((updates as any).client) payload.clientId = (updates as any).client;
      if ((updates as any).treatment)
        payload.treatmentId = (updates as any).treatment;
      if ((updates as any).staff !== undefined)
        payload.staffId = (updates as any).staff || undefined;
      updateMutation.mutate({ id, updates: payload });
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this appointment?")) return;
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageHeader title="Appointments" />
        </HeaderRow>
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageHeader title="Appointments" />
        </HeaderRow>
        <EmptyState>
          <p>
            {(error instanceof Error && error.message) ||
              "Unable to load appointments"}
          </p>
        </EmptyState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <HeaderRow>
        <PageHeader title="Appointments" />
        <HeaderActions>
          <ViewToggle>
            <ViewButton
              $active={viewMode === "month"}
              onClick={() => setViewMode("month")}
              type="button"
            >
              <CalendarIcon size={16} />
              Month
            </ViewButton>
            <ViewButton
              $active={viewMode === "week"}
              onClick={() => setViewMode("week")}
              type="button"
            >
              <List size={16} />
              Week
            </ViewButton>
          </ViewToggle>

          <Button variation="primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            New Appointment
          </Button>
        </HeaderActions>
      </HeaderRow>

      {appointments.length === 0 ? (
        <EmptyState>
          <CalendarIcon size={48} style={{ opacity: 0.5, marginBottom: 12 }} />
          <p>No appointments yet — create one with the button above.</p>
        </EmptyState>
      ) : viewMode === "week" ? (
        <WeekCalendar events={calendarEvents} onEventClick={handleEventClick} />
      ) : (
        <Calendar events={calendarEvents} onEventClick={handleEventClick} />
      )}

      <AppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        values={formValues}
        onChange={(patch) => setFormValues((prev) => ({ ...prev, ...patch }))}
        onSubmit={handleSubmitCreate}
        submitting={createMutation.isPending}
        clients={clients}
        treatments={treatments}
        staff={staff}
      />

      <AppointmentDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onUpdate={(id, values) => handleUpdate(id, values)}
        onDelete={(id) => handleDelete(id)}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
        clients={clients}
        treatments={treatments}
        staff={staff}
      />
    </PageWrapper>
  );
}
