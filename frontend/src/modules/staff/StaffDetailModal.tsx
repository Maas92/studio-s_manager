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
} from "lucide-react";

interface StaffDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: StaffMember | null;
  onUpdate?: (id: string, values: Partial<CreateStaffMemberInput>) => void;
  onDelete?: (id: string) => void;
  updating?: boolean;
  deleting?: boolean;
  isAdmin?: boolean;
}

const PerformanceSection = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1rem;
`;

const PerformanceTitle = styled.h4`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;

const PerformanceGrid = styled.div`
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

const PerformanceMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MetricValue = styled.div<{ $color?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.color.text};
`;

const MetricSubtext = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-top: 0.125rem;
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
  transition: box-shadow 0.12s ease, border-color 0.12s ease;
  box-sizing: border-box;

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding-top: 1rem;
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

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }
`;

export default function StaffDetailModal({
  isOpen,
  onClose,
  member,
  onUpdate,
  onDelete,
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
        `Are you sure you want to remove ${member.name} from staff?`
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

  if (!member) return null;

  const statusVariant = (
    ["active", "inactive", "on_leave"].includes(formValues.status)
      ? formValues.status
      : "active"
  ) as "active" | "inactive" | "on_leave";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isEditing ? "Edit Staff Member" : "Staff Member Details"}
          {!isEditing && (
            <Badge $variant={statusVariant}>
              {formValues.status.replace("_", " ")}
            </Badge>
          )}
        </div>
      }
      size="md"
      ariaLabel="Staff member details"
    >
      <Form>
        {/* Performance Metrics - Admin Only */}
        {isAdmin && member.performance && !isEditing && (
          <PerformanceSection>
            <PerformanceTitle>
              Performance Metrics - This Month
            </PerformanceTitle>
            <PerformanceGrid>
              <PerformanceMetric>
                <MetricLabel>Revenue</MetricLabel>
                <MetricValue $color="#15803d">
                  ${member.performance.totalRevenue.toLocaleString()}
                </MetricValue>
                <MetricSubtext>
                  {member.performance.appointmentsCompleted} completed
                </MetricSubtext>
              </PerformanceMetric>

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
                <MetricSubtext>of available hours</MetricSubtext>
              </PerformanceMetric>

              <PerformanceMetric>
                <MetricLabel>Avg Rating</MetricLabel>
                <MetricValue>
                  {member.performance.averageRating?.toFixed(1) || "N/A"}
                </MetricValue>
                <MetricSubtext>⭐ client rating</MetricSubtext>
              </PerformanceMetric>

              <PerformanceMetric>
                <MetricLabel>Retention</MetricLabel>
                <MetricValue $color="#2563eb">
                  {member.performance.clientRetentionRate?.toFixed(0) || 0}%
                </MetricValue>
                <MetricSubtext>returning clients</MetricSubtext>
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
                <MetricSubtext>
                  {member.performance.appointmentsCancelled} cancelled
                </MetricSubtext>
              </PerformanceMetric>

              <PerformanceMetric>
                <MetricLabel>Hours Worked</MetricLabel>
                <MetricValue>
                  {member.performance.totalHoursWorked?.toFixed(0) || 0}h
                </MetricValue>
                <MetricSubtext>this period</MetricSubtext>
              </PerformanceMetric>
            </PerformanceGrid>
          </PerformanceSection>
        )}

        {/* Name */}
        <FormField>
          <Label htmlFor="staff-name">Name</Label>
          {isEditing ? (
            <Input
              id="staff-name"
              value={formValues.firstName}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, name: e.target.value }))
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
                  setFormValues((prev) => ({ ...prev, email: e.target.value }))
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
                  setFormValues((prev) => ({ ...prev, phone: e.target.value }))
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
          {isEditing && (
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
          )}

          {/* Hire Date */}
          {!isEditing && member.hireDate && (
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
                  <Tag key={idx}>{spec}</Tag>
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
                  disabled={updating || !formValues.firstName || !formValues.role}
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
    </Modal>
  );
}
