import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import toast from "react-hot-toast";
import {
  listStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  type StaffMember,
  type CreateStaffMemberInput,
} from "./api";
import Card from "../../ui/components/Card";
import Button from "../../ui/components/Button";
import Spinner from "../../ui/components/Spinner";
import StaffDetailModal from "./StaffDetailModal";
import CreateStaffModal from "./CreateStaffModal";
import { Plus, Users, Mail, Phone, Briefcase } from "lucide-react";
import { useState, useCallback } from "react";

interface StaffProps {
  isAdmin?: boolean;
}

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1400px;
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

const Grid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StaffCard = styled(Card)`
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadowLg};
  }
`;

const PerformanceBadge = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
`;

const RevenueBadge = styled.div`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${({ theme }) => theme.color.green100 || "#dcfce7"};
  color: ${({ theme }) => theme.color.green700 || "#15803d"};
  box-shadow: ${({ theme }) => theme.shadowSm};
`;

const AppointmentsBadge = styled.div`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${({ theme }) => theme.color.blue100 || "#dbeafe"};
  color: ${({ theme }) => theme.color.blue500 || "#1d4ed8"};
`;

const PerformanceSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const PerformanceTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const PerformanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
`;

const PerformanceMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const MetricValue = styled.div<{ $color?: string }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.color.text};
`;

const StaffHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const StaffAvatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.brand100 || "#dbeafe"};
  color: ${({ theme }) => theme.color.brand700 || "#1d4ed8"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.75rem;
  flex-shrink: 0;
  box-shadow: ${({ theme }) => theme.shadowMd};
`;

const StaffName = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  text-align: center;
`;

const StaffRole = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
`;

const StaffMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.grey700};
`;

const Badge = styled.span<{ $variant: "active" | "inactive" | "on_leave" }>`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case "active":
        return theme.color.green100 || "#dcfce7";
      case "inactive":
        return theme.color.grey100 || "#f3f4f6";
      case "on_leave":
        return theme.color.yellow100 || "#fef3c7";
      default:
        return theme.color.grey100;
    }
  }};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case "active":
        return theme.color.green700 || "#15803d";
      case "inactive":
        return theme.color.grey700 || "#374151";
      case "on_leave":
        return theme.color.yellow700 || "#a16207";
      default:
        return theme.color.grey700;
    }
  }};
`;

const SpecializationsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const SpecTag = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  background: ${({ theme }) => theme.color.brand50 || "#eff6ff"};
  color: ${({ theme }) => theme.color.brand600 || "#2563eb"};
  border: 1px solid ${({ theme }) => theme.color.brand200 || "#bfdbfe"};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.red600 || "#fef2f2"};
  color: ${({ theme }) => theme.color.red500 || "#b91c1c"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.red600 || "#fecaca"};
`;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Staff({ isAdmin = true }: StaffProps) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Query
  const {
    data: staff = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["staff"],
    queryFn: listStaffMembers,
    staleTime: 30000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createStaffMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowCreateModal(false);
      toast.success("Staff member added successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add staff member",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateStaffMemberInput>;
    }) => updateStaffMember(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowDetailModal(false);
      setSelectedMember(null);
      toast.success("Staff member updated successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update staff member",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaffMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowDetailModal(false);
      setSelectedMember(null);
      toast.success("Staff member removed successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove staff member",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  // Handlers
  const handleMemberClick = useCallback((member: StaffMember) => {
    setSelectedMember(member);
    setShowDetailModal(true);
  }, []);

  const handleUpdateMember = useCallback(
    (id: string, updates: Partial<CreateStaffMemberInput>) => {
      updateMutation.mutate({ id, updates });
    },
    [updateMutation]
  );

  const handleDeleteMember = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Staff</PageTitle>
        </HeaderRow>
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Staff</PageTitle>
        </HeaderRow>
        <ErrorMessage>
          {error instanceof Error
            ? error.message
            : "Error loading staff members"}
        </ErrorMessage>
      </PageWrapper>
    );
  }

  const statusVariant = (
    status?: string
  ): "active" | "inactive" | "on_leave" => {
    if (status && ["active", "inactive", "on_leave"].includes(status)) {
      return status as "active" | "inactive" | "on_leave";
    }
    return "active";
  };

  return (
    <PageWrapper>
      <HeaderRow>
        <PageTitle>Staff</PageTitle>
        {isAdmin && (
          <Button
            onClick={() => setShowCreateModal(true)}
            variation="primary"
            size="medium"
          >
            <Plus size={18} />
            Add Staff Member
          </Button>
        )}
      </HeaderRow>

      {staff.length === 0 ? (
        <EmptyState>
          <Users size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <p>No staff members yet.</p>
          {isAdmin && <p>Click "Add Staff Member" to add your team.</p>}
        </EmptyState>
      ) : (
        <Grid>
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              onClick={() => handleMemberClick(member)}
            >
              {/* Performance badges - Admin only */}
              {isAdmin && member.performance && (
                <PerformanceBadge>
                  <RevenueBadge>
                    ${member.performance.totalRevenue.toLocaleString()}
                  </RevenueBadge>
                  <AppointmentsBadge>
                    {member.performance.appointmentsCompleted} appointments
                  </AppointmentsBadge>
                </PerformanceBadge>
              )}

              <StaffHeader>
                <StaffAvatar>{getInitials(member.name)}</StaffAvatar>
                <div style={{ textAlign: "center", width: "100%" }}>
                  <StaffName>{member.name}</StaffName>
                  <StaffRole>
                    <Briefcase size={14} />
                    {member.role}
                  </StaffRole>
                </div>
                <Badge $variant={statusVariant(member.status)}>
                  {member.status?.replace("_", " ") || "active"}
                </Badge>
              </StaffHeader>

              <StaffMeta>
                {member.email && (
                  <MetaRow>
                    <Mail size={14} />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {member.email}
                    </span>
                  </MetaRow>
                )}
                {member.phone && (
                  <MetaRow>
                    <Phone size={14} />
                    <span>{member.phone}</span>
                  </MetaRow>
                )}
              </StaffMeta>

              {member.specializations && member.specializations.length > 0 && (
                <SpecializationsContainer>
                  {member.specializations.slice(0, 3).map((spec, idx) => (
                    <SpecTag key={idx}>{spec}</SpecTag>
                  ))}
                  {member.specializations.length > 3 && (
                    <SpecTag>+{member.specializations.length - 3} more</SpecTag>
                  )}
                </SpecializationsContainer>
              )}

              {/* Performance metrics - Admin only */}
              {isAdmin && member.performance && (
                <PerformanceSection>
                  <PerformanceTitle>This Month</PerformanceTitle>
                  <PerformanceGrid>
                    <PerformanceMetric>
                      <MetricLabel>Utilization</MetricLabel>
                      <MetricValue
                        $color={
                          (member.performance.utilizationRate || 0) >= 80
                            ? "#15803d"
                            : (member.performance.utilizationRate || 0) >= 60
                            ? "#ca8a04"
                            : "#dc2626"
                        }
                      >
                        {member.performance.utilizationRate?.toFixed(0) || 0}%
                      </MetricValue>
                    </PerformanceMetric>

                    <PerformanceMetric>
                      <MetricLabel>Avg Rating</MetricLabel>
                      <MetricValue>
                        {member.performance.averageRating?.toFixed(1) || "N/A"}{" "}
                        ⭐
                      </MetricValue>
                    </PerformanceMetric>

                    <PerformanceMetric>
                      <MetricLabel>Retention</MetricLabel>
                      <MetricValue $color="#2563eb">
                        {member.performance.clientRetentionRate?.toFixed(0) ||
                          0}
                        %
                      </MetricValue>
                    </PerformanceMetric>

                    <PerformanceMetric>
                      <MetricLabel>No-Show Rate</MetricLabel>
                      <MetricValue
                        $color={
                          (member.performance.noShowRate || 0) <= 5
                            ? "#15803d"
                            : (member.performance.noShowRate || 0) <= 10
                            ? "#ca8a04"
                            : "#dc2626"
                        }
                      >
                        {member.performance.noShowRate?.toFixed(0) || 0}%
                      </MetricValue>
                    </PerformanceMetric>
                  </PerformanceGrid>
                </PerformanceSection>
              )}
            </StaffCard>
          ))}
        </Grid>
      )}

      <StaffDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onUpdate={handleUpdateMember}
        onDelete={handleDeleteMember}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <CreateStaffModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={(values) => createMutation.mutate(values)}
          creating={createMutation.isPending}
        />
      )}
    </PageWrapper>
  );
}
