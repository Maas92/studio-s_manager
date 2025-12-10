import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import toast from "react-hot-toast";
import {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listClients,
  listTreatments,
  listStaff,
  type Appointment,
  type CreateAppointmentInput,
} from "./api";
import Button from "../../ui/components/Button";
import Calendar from "../../ui/components/Calendar";
import WeekCalendar from "../../ui/components/WeekCalendar";
import AppointmentModal, {
  type AppointmentFormValues,
} from "./AppointmentsModal";
import AppointmentDetailModal, {
  type AppointmentDetailFormValues,
} from "./AppointmentsDetailModal";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import Spinner from "../../ui/components/Spinner";
import { useState, useCallback, useMemo } from "react";

// Styled Components
const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PageTitle = styled.h2`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem;
  background: ${({ theme }) => theme.color.grey100};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const ViewButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active ? theme.color.panel : "transparent"};
  color: ${({ theme }) => theme.color.text};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;

  &:hover {
    background: ${({ theme }) => theme.color.panel};
  }

  ${({ $active, theme }) =>
    $active &&
    `
    box-shadow: ${theme.shadowSm};
  `}
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.red600};
  color: ${({ theme }) => theme.color.grey100};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.red600};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

// Initial form state
const INITIAL_FORM_STATE: AppointmentFormValues = {
  client: "",
  treatment: "",
  staff: "",
  datetimeLocal: "",
};

// Appointment status colors
const STATUS_COLORS: Record<string, string> = {
  confirmed: "#10b981",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  completed: "#3b82f6",
};

type ViewMode = "month" | "week";

export default function Appointments() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentFormValues>(INITIAL_FORM_STATE);
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  // Queries
  const {
    data: appointments = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["appointments"],
    queryFn: listAppointments,
    staleTime: 30000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: listClients,
    staleTime: 60000,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments"],
    queryFn: listTreatments,
    staleTime: 60000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: listStaff,
    staleTime: 60000,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowCreateModal(false);
      setForm(INITIAL_FORM_STATE);

      toast.success(`Appointment created for ${data.clientName || "client"}`, {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      console.error("Failed to create appointment:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create appointment. Please try again.",
        {
          duration: 5000,
          position: "top-right",
        }
      );
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateAppointmentInput>;
    }) => updateAppointment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowDetailModal(false);
      setSelectedAppointment(null);

      toast.success("Appointment updated successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      console.error("Failed to update appointment:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update appointment. Please try again.",
        {
          duration: 5000,
          position: "top-right",
        }
      );
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowDetailModal(false);
      setSelectedAppointment(null);

      toast.success("Appointment deleted successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      console.error("Failed to delete appointment:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete appointment. Please try again.",
        {
          duration: 5000,
          position: "top-right",
        }
      );
    },
  });

  // Transform appointments into calendar events
  const calendarEvents = useMemo(() => {
    return appointments.map((apt) => {
      // Calculate end time (default 1 hour after start)
      const startTime = new Date(apt.datetimeISO);
      const treatment = treatments.find((t) => t.id === apt.treatmentId);
      const duration = treatment?.durationMinutes || 60;
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      return {
        id: apt.id,
        title: `${apt.clientName || apt.clientId} - ${
          apt.treatmentName || apt.treatmentId
        }`,
        startTime,
        endTime,
        color:
          STATUS_COLORS[apt.status || "confirmed"] || STATUS_COLORS.confirmed,
        data: apt,
      };
    });
  }, [appointments, treatments]);

  // Handlers
  const handleOpenCreateModal = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setForm(INITIAL_FORM_STATE);
  }, []);

  const handleFormChange = useCallback(
    (patch: Partial<AppointmentFormValues>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!form.client || !form.treatment || !form.datetimeLocal) {
      toast.error("Please fill in all required fields", {
        duration: 4000,
        position: "top-right",
      });
      return;
    }

    try {
      const payload: CreateAppointmentInput = {
        clientId: form.client,
        treatmentId: form.treatment,
        datetimeISO: new Date(form.datetimeLocal).toISOString(),
        staffId: form.staff || undefined,
        status: "confirmed",
      };

      await createMutation.mutateAsync(payload);
    } catch (error) {
      // Error is handled by mutation's onError
    }
  }, [form, createMutation]);

  const handleEventClick = useCallback((event: any) => {
    const appointment = event.data as Appointment;
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  }, []);

  const handleUpdateAppointment = useCallback(
    (id: string, values: Partial<AppointmentDetailFormValues>) => {
      const updates: Partial<CreateAppointmentInput> = {};

      if (values.datetimeLocal) {
        updates.datetimeISO = values.datetimeLocal;
      }
      if (values.client) {
        updates.clientId = values.client;
      }
      if (values.treatment) {
        updates.treatmentId = values.treatment;
      }
      if (values.staff !== undefined) {
        updates.staffId = values.staff || undefined;
      }
      if (values.status) {
        updates.status = values.status as any;
      }
      if (values.notes !== undefined) {
        updates.notes = values.notes;
      }

      updateMutation.mutate({ id, updates });
    },
    [updateMutation]
  );

  const handleDeleteAppointment = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  // Render loading state
  if (isLoading) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Appointments</PageTitle>
        </HeaderRow>
        <Spinner />
      </PageWrapper>
    );
  }

  // Render error state
  if (isError) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Appointments</PageTitle>
        </HeaderRow>
        <ErrorMessage>
          {error instanceof Error
            ? error.message
            : "Error loading appointments. Please try again."}
        </ErrorMessage>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <HeaderRow>
        <PageTitle>Appointments</PageTitle>
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
          <Button
            onClick={handleOpenCreateModal}
            variation="primary"
            size="medium"
            aria-label="Create new appointment"
          >
            <Plus size={18} />
            New Appointment
          </Button>
        </HeaderActions>
      </HeaderRow>

      {appointments.length === 0 ? (
        <EmptyState>
          <CalendarIcon
            size={48}
            style={{ margin: "0 auto 1rem", opacity: 0.5 }}
          />
          <p>No appointments scheduled yet.</p>
          <p>Click "New Appointment" to create one.</p>
        </EmptyState>
      ) : (
        <>
          {viewMode === "week" ? (
            <WeekCalendar
              events={calendarEvents}
              onEventClick={handleEventClick}
            />
          ) : (
            <Calendar events={calendarEvents} onEventClick={handleEventClick} />
          )}
        </>
      )}

      <AppointmentModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        values={form}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
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
        onUpdate={handleUpdateAppointment}
        onDelete={handleDeleteAppointment}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
        clients={clients}
        treatments={treatments}
        staff={staff}
      />
    </PageWrapper>
  );
}
