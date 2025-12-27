import React, { useState, useCallback, useEffect, useMemo } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import StatsSection from "../../ui/components/StatsSection";
import StatCard from "../../ui/components/StatCard";
import ModalActions from "../../ui/components/ModalActions";
import FormField from "../../ui/components/FormField";
import InfoGrid from "../../ui/components/InfoGrid";
import Tag from "../../ui/components/Tag";
import styled from "styled-components";
import type { Treatment, CreateTreatmentInput } from "./api";
import type { Appointment } from "../appointments/AppointmentsSchema";
import {
  Edit2,
  Save,
  X,
  Trash2,
  Calendar,
  Clock,
  DollarSign,
  Tags,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Users,
  Percent,
  Star,
  Activity,
  Target,
} from "lucide-react";

interface TreatmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatment: Treatment | null;
  onUpdate?: (id: string, values: Partial<CreateTreatmentInput>) => void;
  onDelete?: (id: string) => void;
  onBook?: (treatmentId: string, treatmentName: string) => void;
  updating?: boolean;
  deleting?: boolean;
  appointments?: Appointment[];
  isAdmin?: boolean;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const Section = styled.div`
  display: grid;
  gap: 1rem;
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ReadOnlyField = styled.div`
  padding: 0.8rem 0;
  color: ${({ theme }) => theme.color.text};
  font-size: 0.95rem;
  line-height: 1.6;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const EditModeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export default function TreatmentDetailModal({
  isOpen,
  onClose,
  treatment,
  onUpdate,
  onDelete,
  onBook,
  updating = false,
  deleting = false,
  appointments = [],
  isAdmin = false,
}: TreatmentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<CreateTreatmentInput>({
    name: "",
    description: "",
    durationMinutes: 0,
    price: 0,
    category: "",
    benefits: [],
    contraindications: [],
    preparationInstructions: "",
    aftercareInstructions: "",
    isActive: true,
    tags: [],
  });

  useEffect(() => {
    if (treatment) {
      setFormValues({
        name: treatment.name,
        description: treatment.description || "",
        durationMinutes: treatment.durationMinutes,
        price: treatment.price,
        category: treatment.category || "",
        benefits: treatment.benefits || [],
        contraindications: treatment.contraindications || [],
        preparationInstructions: treatment.preparationInstructions || "",
        aftercareInstructions: treatment.aftercareInstructions || "",
        isActive: treatment.isActive,
        tags: treatment.tags || [],
      });
      setIsEditing(false);
    }
  }, [treatment]);

  const treatmentStats = useMemo(() => {
    if (!treatment) return null;

    const treatmentAppts = appointments.filter(
      (a) => a.treatmentId === treatment.id
    );
    const completed = treatmentAppts.filter((a) => a.status === "completed");
    const cancelled = treatmentAppts.filter((a) => a.status === "cancelled");
    const upcoming = treatmentAppts.filter(
      (a) =>
        new Date(a.datetimeISO).getTime() >= Date.now() &&
        a.status === "confirmed"
    );

    const totalRevenue = completed.reduce(
      (sum, appt) => sum + (appt.price || treatment.price || 0),
      0
    );

    // Calculate unique clients
    const uniqueClients = new Set(treatmentAppts.map((a) => a.clientId)).size;

    // Calculate repeat booking rate
    const repeatRate =
      uniqueClients > 0
        ? ((treatmentAppts.length - uniqueClients) / treatmentAppts.length) *
          100
        : 0;

    // Calculate cancellation rate
    const cancellationRate =
      treatmentAppts.length > 0
        ? (cancelled.length / treatmentAppts.length) * 100
        : 0;

    // Calculate average rating (mock - would come from reviews)
    const avgRating = 4.6;

    // Calculate booking frequency (bookings per week)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentBookings = treatmentAppts.filter(
      (a) => new Date(a.datetimeISO).getTime() >= thirtyDaysAgo
    );
    const bookingsPerWeek = (recentBookings.length / 30) * 7;

    return {
      totalBookings: treatmentAppts.length,
      completed: completed.length,
      cancelled: cancelled.length,
      upcoming: upcoming.length,
      totalRevenue,
      uniqueClients,
      repeatRate,
      cancellationRate,
      avgRating,
      bookingsPerWeek,
      revenuePerBooking:
        completed.length > 0 ? totalRevenue / completed.length : 0,
    };
  }, [treatment, appointments]);

  const handleSave = useCallback(() => {
    if (!treatment || !isAdmin) return;
    onUpdate?.(treatment.id, formValues);
    setIsEditing(false);
  }, [treatment, formValues, onUpdate, isAdmin]);

  const handleDelete = useCallback(() => {
    if (!treatment || !isAdmin) return;
    if (
      window.confirm(`Are you sure you want to delete "${treatment.name}"?`)
    ) {
      onDelete?.(treatment.id);
    }
  }, [treatment, onDelete, isAdmin]);

  const handleCancel = useCallback(() => {
    if (treatment) {
      setFormValues({
        name: treatment.name,
        description: treatment.description || "",
        durationMinutes: treatment.durationMinutes,
        price: treatment.price,
        category: treatment.category || "",
        benefits: treatment.benefits || [],
        contraindications: treatment.contraindications || [],
        preparationInstructions: treatment.preparationInstructions || "",
        aftercareInstructions: treatment.aftercareInstructions || "",
        isActive: treatment.isActive,
        tags: treatment.tags || [],
      });
    }
    setIsEditing(false);
  }, [treatment]);

  const handleBook = useCallback(() => {
    if (!treatment) return;
    onBook?.(treatment.id, treatment.name);
    onClose();
  }, [treatment, onBook, onClose]);

  if (!treatment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Treatment" : treatment.name}
      size="lg"
      ariaLabel="Treatment details"
    >
      <Content>
        {/* Treatment Stats - Admin Only */}

        {isAdmin && treatmentStats && !isEditing && (
          <StatsSection
            title="Treatment Performance - All Time"
            icon={<Activity size={18} />}
            columns={4}
          >
            {/* Total Revenue */}
            <StatCard
              label="Total Revenue"
              value={`$${treatmentStats.totalRevenue.toLocaleString()}`}
              subtext={`${treatmentStats.completed} completed`}
              icon={<DollarSign size={18} />}
              variant="success"
              iconColor="#15803d"
              valueColor="#15803d"
            />

            {/* Total Bookings */}
            <StatCard
              label="Total Bookings"
              value={treatmentStats.totalBookings}
              subtext={`${treatmentStats.completed} completed`}
              icon={<Calendar size={18} />}
              variant="info"
              iconColor="#2563eb"
              valueColor="#2563eb"
            />

            {/* Unique Clients */}
            <StatCard
              label="Unique Clients"
              value={treatmentStats.uniqueClients}
              subtext="served this treatment"
              icon={<Users size={18} />}
              variant="info"
              iconColor="#2563eb"
              valueColor="#2563eb"
            />

            {/* Upcoming */}
            <StatCard
              label="Upcoming"
              value={treatmentStats.upcoming}
              subtext="scheduled bookings"
              icon={<Clock size={18} />}
              variant="warning"
              iconColor="#ca8a04"
              valueColor="#ca8a04"
            />

            {/* Repeat Booking Rate */}
            <StatCard
              label="Repeat Rate"
              value={`${treatmentStats.repeatRate.toFixed(0)}%`}
              subtext="client retention"
              icon={<TrendingUp size={18} />}
              variant={
                treatmentStats.repeatRate >= 50
                  ? "success"
                  : treatmentStats.repeatRate >= 30
                  ? "warning"
                  : "info"
              }
              iconColor={
                treatmentStats.repeatRate >= 50
                  ? "#15803d"
                  : treatmentStats.repeatRate >= 30
                  ? "#ca8a04"
                  : "#2563eb"
              }
              valueColor={
                treatmentStats.repeatRate >= 50
                  ? "#15803d"
                  : treatmentStats.repeatRate >= 30
                  ? "#ca8a04"
                  : "#2563eb"
              }
            />

            {/* Average Rating */}
            <StatCard
              label="Avg Rating"
              value={treatmentStats.avgRating.toFixed(1)}
              subtext="⭐ client feedback"
              icon={<Star size={18} />}
              variant="success"
              iconColor="#15803d"
              valueColor="#15803d"
            />

            {/* Cancellation Rate */}
            <StatCard
              label="Cancel Rate"
              value={`${treatmentStats.cancellationRate.toFixed(1)}%`}
              subtext={`${treatmentStats.cancelled} cancelled`}
              icon={<Percent size={18} />}
              variant={
                treatmentStats.cancellationRate <= 5
                  ? "success"
                  : treatmentStats.cancellationRate <= 15
                  ? "warning"
                  : "info"
              }
              iconColor={
                treatmentStats.cancellationRate <= 5
                  ? "#15803d"
                  : treatmentStats.cancellationRate <= 15
                  ? "#ca8a04"
                  : "#2563eb"
              }
              valueColor={
                treatmentStats.cancellationRate <= 5
                  ? "#15803d"
                  : treatmentStats.cancellationRate <= 15
                  ? "#ca8a04"
                  : "#2563eb"
              }
            />

            {/* Booking Frequency */}
            <StatCard
              label="Weekly Rate"
              value={treatmentStats.bookingsPerWeek.toFixed(1)}
              subtext="bookings per week"
              icon={<Target size={18} />}
              variant="info"
              iconColor="#6b7280"
              valueColor="#2563eb"
            />
          </StatsSection>
        )}

        {!isEditing && (
          <InfoGrid
            items={[
              {
                label: "Duration",
                value: `${treatment.durationMinutes} min`,
                icon: <Clock size={20} />,
              },
              {
                label: "Price",
                value: `$${treatment.price.toFixed(2)}`,
                icon: <DollarSign size={20} />,
              },
              {
                label: "Category",
                value: treatment.category || "Uncategorized",
                icon: <Tags size={20} />,
              },
            ]}
            columns={3}
          />
        )}

        {isEditing ? (
          <>
            <FormField
              label="Name"
              id="treatment-name"
              value={formValues.name}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />

            <FormField
              label="Description"
              id="treatment-description"
              value={formValues.description ?? ""}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe this treatment..."
            />

            <EditModeGrid>
              <FormField
                label="Duration (minutes)"
                id="treatment-duration"
                type="number"
                min="1"
                value={formValues.durationMinutes}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    durationMinutes: Number(e.target.value),
                  }))
                }
                required
              />

              <FormField
                label="Price ($)"
                id="treatment-price"
                type="number"
                min="0"
                step="0.01"
                value={formValues.price}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    price: Number(e.target.value),
                  }))
                }
                required
              />

              <FormField
                label="Category"
                id="treatment-category"
                value={formValues.category ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
              />
            </EditModeGrid>

            <FormField
              label="Tags (comma separated)"
              id="treatment-tags"
              value={(formValues.tags || []).join(", ")}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  tags: e.target.value
                    ? e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    : [],
                }))
              }
              placeholder="relaxing, facial, popular"
            />
          </>
        ) : (
          <>
            {treatment.description && (
              <Section>
                <ReadOnlyField>{treatment.description}</ReadOnlyField>
              </Section>
            )}

            {treatment.benefits && treatment.benefits.length > 0 && (
              <Section>
                <SectionTitle>
                  <CheckCircle size={18} />
                  Benefits
                </SectionTitle>
                <TagsContainer>
                  {treatment.benefits.map((benefit, idx) => (
                    <Tag key={idx} variant="benefit">
                      <CheckCircle size={12} />
                      {benefit}
                    </Tag>
                  ))}
                </TagsContainer>
              </Section>
            )}

            {treatment.contraindications &&
              treatment.contraindications.length > 0 && (
                <Section>
                  <SectionTitle>
                    <AlertTriangle size={18} />
                    Contraindications
                  </SectionTitle>
                  <TagsContainer>
                    {treatment.contraindications.map((contra, idx) => (
                      <Tag
                        key={idx}
                        variant="warning"
                        icon={<AlertTriangle size={12} />}
                      >
                        {contra}
                      </Tag>
                    ))}
                  </TagsContainer>
                </Section>
              )}

            {treatment.preparationInstructions && (
              <Section>
                <SectionTitle>
                  <Info size={18} />
                  Preparation Instructions
                </SectionTitle>
                <ReadOnlyField>
                  {treatment.preparationInstructions}
                </ReadOnlyField>
              </Section>
            )}

            {treatment.aftercareInstructions && (
              <Section>
                <SectionTitle>
                  <Info size={18} />
                  Aftercare Instructions
                </SectionTitle>
                <ReadOnlyField>{treatment.aftercareInstructions}</ReadOnlyField>
              </Section>
            )}

            {treatment.tags && treatment.tags.length > 0 && (
              <Section>
                <TagsContainer>
                  {treatment.tags.map((tag, idx) => (
                    <Tag key={idx}>{tag}</Tag>
                  ))}
                </TagsContainer>
              </Section>
            )}
          </>
        )}
        <ModalActions
          isEditing={isEditing}
          onSave={handleSave}
          onCancel={handleCancel}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDelete}
          onClose={onClose}
          saving={updating}
          deleting={deleting}
          canEdit={isAdmin}
          canDelete={isAdmin}
          saveDisabled={
            !formValues.name ||
            !formValues.durationMinutes ||
            formValues.price < 0
          }
          leftActions={
            !isEditing && (
              <Button variation="primary" type="button" onClick={handleBook}>
                <Calendar size={16} />
                Book This Treatment
              </Button>
            )
          }
        />
      </Content>
    </Modal>
  );
}
