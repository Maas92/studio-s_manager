import React, { useCallback, useMemo, useState, useEffect } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { useLocation } from "react-router-dom";

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
import useAuth from "../../hooks/useAuth";

import { type Appointment } from "./AppointmentsSchema";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const ControlsWrapper = styled.div`
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.color.bg};
  z-index: 5;
  padding-bottom: 1rem;
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
  border: 1px solid ${({ theme }) => theme.color.border};
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
  font-weight: 500;
  transition: all 0.15s ease;
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadowSm : "none")};

  svg {
    color: ${({ $active, theme }) =>
      $active ? theme.color.brand600 : theme.color.mutedText};
  }

  &:hover {
    background: ${({ theme }) => theme.color.panel};
  }
`;

const EmptyStateWrapper = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const INITIAL_FORM_STATE: AppointmentFormValues = {
  client: "",
  treatment: "",
  staff: "",
  datetimeLocal: "",
};

type ViewMode = "week" | "month";

export default function Appointments() {
  const location = useLocation();
  const { canManageAppointments } = useAuth();

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

  // Handle incoming navigation state (from booking in treatments)
  useEffect(() => {
    const state = location.state as any;
    if (state?.createAppointment && state?.treatmentId) {
      setFormValues({
        ...INITIAL_FORM_STATE,
        treatment: state.treatmentId,
      });
      setShowCreateModal(true);

      // Show success message
      if (state.treatmentName) {
        toast.success(`Creating appointment for ${state.treatmentName}`);
      }

      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Transform appointments for calendar
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
    try {
      await createMutation.mutateAsync({
        clientId: formValues.client,
        treatmentId: formValues.treatment,
        staffId: formValues.staff || undefined,
        datetimeISO: new Date(formValues.datetimeLocal).toISOString(),
      });

      toast.success("Appointment created successfully!");
      setShowCreateModal(false);
      setFormValues(INITIAL_FORM_STATE);
    } catch (err: any) {
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
      if ((updates as any).status) payload.status = (updates as any).status;
      if ((updates as any).notes !== undefined)
        payload.notes = (updates as any).notes;

      updateMutation.mutate(
        { id, updates: payload },
        {
          onSuccess: () => {
            toast.success("Appointment updated successfully!");
            setShowDetailModal(false);
          },
          onError: (err: any) => {
            toast.error(err?.message ?? "Failed to update appointment");
          },
        }
      );
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this appointment?")) return;
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Appointment deleted successfully!");
          setShowDetailModal(false);
        },
        onError: (err: any) => {
          toast.error(err?.message ?? "Failed to delete appointment");
        },
      });
    },
    [deleteMutation]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageHeader title="Appointments" />
        </HeaderRow>
        <div
          style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
        >
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageHeader title="Appointments" />
        </HeaderRow>
        <EmptyStateWrapper>
          <p>
            {(error instanceof Error && error.message) ||
              "Unable to load appointments"}
          </p>
        </EmptyStateWrapper>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ControlsWrapper>
        <HeaderRow>
          <PageHeader title="Appointments" />
          <HeaderActions>
            <ViewToggle>
              <ViewButton
                $active={viewMode === "month"}
                onClick={() => setViewMode("month")}
                type="button"
                aria-label="Month view"
              >
                <CalendarIcon size={16} />
                Month
              </ViewButton>
              <ViewButton
                $active={viewMode === "week"}
                onClick={() => setViewMode("week")}
                type="button"
                aria-label="Week view"
              >
                <List size={16} />
                Week
              </ViewButton>
            </ViewToggle>

            {canManageAppointments && (
              <Button variation="primary" onClick={handleOpenCreate}>
                <Plus size={16} />
                New Appointment
              </Button>
            )}
          </HeaderActions>
        </HeaderRow>
      </ControlsWrapper>

      {appointments.length === 0 ? (
        <EmptyStateWrapper>
          <CalendarIcon size={48} style={{ opacity: 0.5, marginBottom: 12 }} />
          <p>No appointments yet</p>
          {canManageAppointments && (
            <p style={{ fontSize: "0.9rem" }}>
              Create one with the button above.
            </p>
          )}
        </EmptyStateWrapper>
      ) : viewMode === "week" ? (
        <WeekCalendar events={calendarEvents} onEventClick={handleEventClick} />
      ) : (
        <Calendar events={calendarEvents} onEventClick={handleEventClick} />
      )}

      {canManageAppointments && (
        <AppointmentModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setFormValues(INITIAL_FORM_STATE);
          }}
          values={formValues}
          onChange={(patch) => setFormValues((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleSubmitCreate}
          submitting={createMutation.isPending}
          clients={clients}
          treatments={treatments}
          staff={staff}
        />
      )}

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
        canEdit={canManageAppointments}
      />
    </PageWrapper>
  );
}
