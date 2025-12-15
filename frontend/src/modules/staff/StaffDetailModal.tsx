import React, { useState, useCallback, useEffect } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { StaffMember, CreateStaffMemberInput } from "./api";
import {
  Edit2,
  Save,
  X,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Award,
  Calendar,
  User as UserIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  Users,
  AlertCircle,
} from "lucide-react";

interface StaffDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: StaffMember | null;
  onUpdate?: (id: string, values: Partial<CreateStaffMemberInput>) => void;
  onDelete?: (id: string) => void;
  onBookStaff?: (staffId: string, staffName: string) => void;
  updating?: boolean;
  deleting?: boolean;
  isAdmin?: boolean;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const PerformanceSection = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const PerformanceTitle = styled.h4`
  margin: 0 0 1.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const KPICard = styled.div<{
  $variant?: "success" | "warning" | "danger" | "info";
}>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-left: 3px solid
    ${({ $variant, theme }) => {
      switch ($variant) {
        case "success":
          return theme.color.green500;
        case "warning":
          return theme.color.yellow700;
        case "danger":
          return theme.color.red600;
        case "info":
          return theme.color.blue500;
        default:
          return theme.color.brand600;
      }
    }};
`;

const KPIHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const KPILabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const KPIIcon = styled.div<{ $color?: string }>`
  color: ${({ $color, theme }) => $color || theme.color.brand600};
`;

const KPIValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.color.text};
  line-height: 1;
`;

const KPISubtext = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const TrendIndicator = styled.span<{ $direction: "up" | "down" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  color: ${({ $direction, theme }) =>
    $direction === "up" ? theme.color.green700 : theme.color.red600};
  font-weight: 600;
`;

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

const ReadOnlyField = styled.div`
  padding: 0.8rem 1.2rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.text};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Badge = styled.span<{ $variant: "active" | "inactive" | "on_leave" }>`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.round};
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

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Tag = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  background: ${({ theme }) => theme.color.brand100 || "#dbeafe"};
  color: ${({ theme }) => theme.color.brand700 || "#1d4ed8"};
  border: 1px solid ${({ theme }) => theme.color.brand200 || "#bfdbfe"};
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

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400};
  }

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

export default function StaffDetailModal({
  isOpen,
  onClose,
  member,
  onUpdate,
  onDelete,
  onBookStaff,
  updating = false,
  deleting = false,
  isAdmin = false,
}: StaffDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<CreateStaffMemberInput>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    specializations: [],
    status: "active",
    hireDate: "",
    bio: "",
    certifications: [],
  });

  useEffect(() => {
    if (member) {
      setFormValues({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email || "",
        phone: member.phone || "",
        role: member.role,
        specializations: member.specializations || [],
        status: member.status || "active",
        hireDate: member.hireDate || "",
        bio: member.bio || "",
        certifications: member.certifications || [],
      });
      setIsEditing(false);
    }
  }, [member]);

  const handleSave = useCallback(() => {
    if (!member || !isAdmin) return;
    onUpdate?.(member.id, formValues);
    setIsEditing(false);
  }, [member, formValues, onUpdate, isAdmin]);

  const handleDelete = useCallback(() => {
    if (!member || !isAdmin) return;
    if (
      window.confirm(
        `Are you sure you want to remove ${member.firstName} ${member.lastName} from staff?`
      )
    ) {
      onDelete?.(member.id);
    }
  }, [member, onDelete, isAdmin]);

  const handleCancel = useCallback(() => {
    if (member) {
      setFormValues({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email || "",
        phone: member.phone || "",
        role: member.role,
        specializations: member.specializations || [],
        status: member.status || "active",
        hireDate: member.hireDate || "",
        bio: member.bio || "",
        certifications: member.certifications || [],
      });
    }
    setIsEditing(false);
  }, [member]);

  const handleBookStaff = useCallback(() => {
    if (!member) return;
    onBookStaff?.(member.id, `${member.firstName} ${member.lastName}`);
    onClose();
  }, [member, onBookStaff, onClose]);

  if (!member) return null;

  const statusVariant = (
    ["active", "inactive", "on_leave"].includes(formValues.status)
      ? formValues.status
      : "active"
  ) as "active" | "inactive" | "on_leave";

  const perf = member.performance;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isEditing
            ? "Edit Staff Member"
            : `${member.firstName} ${member.lastName}`}
          {!isEditing && (
            <Badge $variant={statusVariant}>
              {formValues.status.replace("_", " ")}
            </Badge>
          )}
        </div>
      }
      size="lg"
      ariaLabel="Staff member details"
    >
      <Content>
        {/* Performance Metrics - Owner Only */}
        {isAdmin && perf && !isEditing && (
          <PerformanceSection>
            <PerformanceTitle>
              <TrendingUp size={18} />
              Performance Metrics - This Month
            </PerformanceTitle>
            <KPIGrid>
              {/* Revenue */}
              <KPICard $variant="success">
                <KPIHeader>
                  <KPILabel>Revenue</KPILabel>
                  <KPIIcon $color="#15803d">
                    <DollarSign size={18} />
                  </KPIIcon>
                </KPIHeader>
                <KPIValue $color="#15803d">
                  ${perf.totalRevenue.toLocaleString()}
                </KPIValue>
                <KPISubtext>{perf.appointmentsCompleted} completed</KPISubtext>
              </KPICard>

              {/* Utilization Rate */}
              <KPICard
                $variant={
                  (perf.utilizationRate || 0) >= 80
                    ? "success"
                    : (perf.utilizationRate || 0) >= 60
                    ? "warning"
                    : "danger"
                }
              >
                <KPIHeader>
                  <KPILabel>Utilization</KPILabel>
                  <KPIIcon
                    $color={
                      (perf.utilizationRate || 0) >= 80
                        ? "#15803d"
                        : (perf.utilizationRate || 0) >= 60
                        ? "#ca8a04"
                        : "#dc2626"
                    }
                  >
                    <Clock size={18} />
                  </KPIIcon>
                </KPIHeader>
                <KPIValue
                  $color={
                    (perf.utilizationRate || 0) >= 80
                      ? "#15803d"
                      : (perf.utilizationRate || 0) >= 60
                      ? "#ca8a04"
                      : "#dc2626"
                  }
                >
                  {perf.utilizationRate?.toFixed(0) || 0}%
                </KPIValue>
                <KPISubtext>
                  {perf.totalHoursWorked?.toFixed(0) || 0}h worked
                </KPISubtext>
              </KPICard>

              {/* Average Rating */}
              <KPICard $variant="info">
                <KPIHeader>
                  <KPILabel>Avg Rating</KPILabel>
                  <KPIIcon $color="#2563eb">
                    <Star size={18} />
                  </KPIIcon>
                </KPIHeader>
                <KPIValue>{perf.averageRating?.toFixed(1) || "N/A"}</KPIValue>
                <KPISubtext>⭐ client feedback</KPISubtext>
              </KPICard>

              {/* Client Retention */}
              <KPICard $variant="success">
                <KPIHeader>
                  <KPILabel>Retention</KPILabel>
                  <KPIIcon $color="#15803d">
                    <Users size={18} />
                  </KPIIcon>
                </KPIHeader>
                <KPIValue $color="#15803d">
                  {perf.clientRetentionRate?.toFixed(0) || 0}%
                </KPIValue>
                <KPISubtext>
                  <TrendIndicator $direction="up">
                    <TrendingUp size={12} />
                    +5%
                  </TrendIndicator>
                  vs last month
                </KPISubtext>
              </KPICard>

              {/* No-Show Rate */}
              <KPICard
                $variant={
                  (perf.noShowRate || 0) <= 5
                    ? "success"
                    : (perf.noShowRate || 0) <= 10
                    ? "warning"
                    : "danger"
                }
              >
                <KPIHeader>
                  <KPILabel>No-Show Rate</KPILabel>
                  <KPIIcon
                    $color={
                      (perf.noShowRate || 0) <= 5
                        ? "#15803d"
                        : (perf.noShowRate || 0) <= 10
                        ? "#ca8a04"
                        : "#dc2626"
                    }
                  >
                    <AlertCircle size={18} />
                  </KPIIcon>
                </KPIHeader>
                <KPIValue
                  $color={
                    (perf.noShowRate || 0) <= 5
                      ? "#15803d"
                      : (perf.noShowRate || 0) <= 10
                      ? "#ca8a04"
                      : "#dc2626"
                  }
                >
                  {perf.noShowRate?.toFixed(1) || 0}%
                </KPIValue>
                <KPISubtext>{perf.appointmentsCancelled} cancelled</KPISubtext>
              </KPICard>

              {/* Total Appointments */}
              <KPICard $variant="info">
                <KPIHeader>
                  <KPILabel>Appointments</KPILabel>
                  <KPIIcon $color="#2563eb">
                    <Calendar size={18} />
                  </KPIIcon>
                </KPIHeader>
                <KPIValue $color="#2563eb">
                  {perf.appointmentsCompleted}
                </KPIValue>
                <KPISubtext>completed this month</KPISubtext>
              </KPICard>
            </KPIGrid>
          </PerformanceSection>
        )}

        <Form>
          {/* Name Fields */}
          <InfoGrid>
            <FormField>
              <Label htmlFor="staff-first-name">First Name</Label>
              {isEditing ? (
                <Input
                  id="staff-first-name"
                  value={formValues.firstName}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
              ) : (
                <ReadOnlyField>
                  <UserIcon size={16} />
                  {member.firstName}
                </ReadOnlyField>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="staff-last-name">Last Name</Label>
              {isEditing ? (
                <Input
                  id="staff-last-name"
                  value={formValues.lastName}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                />
              ) : (
                <ReadOnlyField>{member.lastName}</ReadOnlyField>
              )}
            </FormField>
          </InfoGrid>

          <InfoGrid>
            {/* Email */}
            <FormField>
              <Label htmlFor="staff-email">Email</Label>
              {isEditing ? (
                <Input
                  id="staff-email"
                  type="email"
                  value={formValues.email}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              ) : (
                <ReadOnlyField>
                  <Mail size={16} />
                  {member.email || "Not provided"}
                </ReadOnlyField>
              )}
            </FormField>

            {/* Phone */}
            <FormField>
              <Label htmlFor="staff-phone">Phone</Label>
              {isEditing ? (
                <Input
                  id="staff-phone"
                  type="tel"
                  value={formValues.phone}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                />
              ) : (
                <ReadOnlyField>
                  <Phone size={16} />
                  {member.phone || "Not provided"}
                </ReadOnlyField>
              )}
            </FormField>
          </InfoGrid>

          <InfoGrid>
            {/* Role */}
            <FormField>
              <Label htmlFor="staff-role">Role</Label>
              {isEditing ? (
                <Input
                  id="staff-role"
                  value={formValues.role}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, role: e.target.value }))
                  }
                  required
                />
              ) : (
                <ReadOnlyField>
                  <Briefcase size={16} />
                  {member.role}
                </ReadOnlyField>
              )}
            </FormField>

            {/* Status */}
            {isEditing ? (
              <FormField>
                <Label htmlFor="staff-status">Status</Label>
                <Select
                  id="staff-status"
                  value={formValues.status}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      status: e.target.value as any,
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </Select>
              </FormField>
            ) : (
              member.hireDate && (
                <FormField>
                  <Label>Hire Date</Label>
                  <ReadOnlyField>
                    <Calendar size={16} />
                    {new Date(member.hireDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </ReadOnlyField>
                </FormField>
              )
            )}
          </InfoGrid>

          {/* Specializations */}
          {!isEditing &&
            member.specializations &&
            member.specializations.length > 0 && (
              <FormField>
                <Label>Specializations</Label>
                <TagsContainer>
                  {member.specializations.map((spec, idx) => (
                    <Tag key={idx}>
                      <Award size={12} style={{ marginRight: "0.25rem" }} />
                      {spec}
                    </Tag>
                  ))}
                </TagsContainer>
              </FormField>
            )}

          {/* Certifications */}
          {!isEditing &&
            member.certifications &&
            member.certifications.length > 0 && (
              <FormField>
                <Label>Certifications</Label>
                <ReadOnlyField>
                  <Award size={16} />
                  {member.certifications.join(", ")}
                </ReadOnlyField>
              </FormField>
            )}

          {/* Bio */}
          <FormField>
            <Label htmlFor="staff-bio">Bio</Label>
            {isEditing ? (
              <TextArea
                id="staff-bio"
                value={formValues.bio}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Add a bio..."
              />
            ) : (
              <ReadOnlyField>{member.bio || "No bio provided"}</ReadOnlyField>
            )}
          </FormField>

          {/* Actions */}
          <Actions>
            <LeftActions>
              {!isEditing && (
                <Button
                  variation="primary"
                  type="button"
                  onClick={handleBookStaff}
                >
                  <Calendar size={16} />
                  Book with {member.firstName}
                </Button>
              )}
              {!isEditing && isAdmin && (
                <Button
                  variation="danger"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 size={16} />
                  {deleting ? "Removing..." : "Remove"}
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
                    disabled={
                      updating || !formValues.firstName || !formValues.role
                    }
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
                  {isAdmin && (
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
        </Form>
      </Content>
    </Modal>
  );
}
