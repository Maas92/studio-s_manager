import React, { useState, useCallback, useEffect, useMemo } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import type { StaffMember, CreateStaffMemberInput } from "./api";
import type { Appointment } from "../appointments/AppointmentsSchema";
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
  Percent,
  Target,
  Activity,
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
  appointments?: Appointment[];
  isAdmin?: boolean;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const StatsSection = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const StatsTitle = styled.h4`
  margin: 0 0 1.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div<{
  $variant?: "success" | "info" | "warning" | "danger";
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

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatIcon = styled.div<{ $color?: string }>`
  color: ${({ $color }) => $color};
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.color.text};
  line-height: 1;
`;

const StatSubtext = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const PayrollSection = styled.div`
  padding: 1.5rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.brand50},
    ${({ theme }) => theme.color.blue100}
  );
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const PayrollTitle = styled.h4`
  margin: 0 0 1.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PayrollGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PayrollCard = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const PayrollLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  margin-bottom: 0.5rem;
`;

const PayrollValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;
`;

const PayrollDetail = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
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
  align-items: center;
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
  appointments = [],
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
    hourlyRate: 0,
    commissionRate: 0,
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
        hourlyRate: member.hourlyRate || 0,
        commissionRate: member.commissionRate || 0,
      });
      setIsEditing(false);
    }
  }, [member]);

  const staffStats = useMemo(() => {
    if (!member) return null;

    const staffAppts = appointments.filter((a) => a.staffId === member.id);
    const completed = staffAppts.filter((a) => a.status === "completed");
    const cancelled = staffAppts.filter((a) => a.status === "cancelled");
    const noShow = staffAppts.filter((a) => a.status === "no_show");

    const totalRevenue = completed.reduce(
      (sum, appt) => sum + (appt.price || 0),
      0
    );

    const now = Date.now();
    const upcoming = staffAppts.filter(
      (a) =>
        new Date(a.datetimeISO).getTime() >= now && a.status === "confirmed"
    );

    // Calculate total hours worked (assuming each appointment duration)
    const totalMinutes = completed.reduce(
      (sum, appt) => sum + (appt.duration || 60),
      0
    );
    const totalHours = totalMinutes / 60;

    // Calculate utilization rate (assuming 40 hour work week, 4 weeks month = 160 hours)
    const availableHours = 160;
    const utilizationRate = (totalHours / availableHours) * 100;

    // Calculate average rating (mock - would come from reviews)
    const avgRating = 4.7;

    // Calculate client retention (mock calculation)
    const uniqueClients = new Set(completed.map((a) => a.clientId)).size;
    const repeatClients = completed.length - uniqueClients;
    const retentionRate =
      uniqueClients > 0 ? (repeatClients / completed.length) * 100 : 0;

    // No-show rate
    const noShowRate =
      staffAppts.length > 0 ? (noShow.length / staffAppts.length) * 100 : 0;

    return {
      totalAppointments: staffAppts.length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      upcoming: upcoming.length,
      totalRevenue,
      totalHours,
      utilizationRate,
      avgRating,
      retentionRate,
      noShowRate,
      uniqueClients,
    };
  }, [member, appointments]);

  const payrollData = useMemo(() => {
    if (!member || !staffStats) return null;

    const hourlyWages = (member.hourlyRate || 0) * staffStats.totalHours;
    const commission =
      staffStats.totalRevenue * ((member.commissionRate || 0) / 100);
    const totalEarnings = hourlyWages + commission;

    return {
      hourlyWages,
      commission,
      totalEarnings,
      hoursWorked: staffStats.totalHours,
      appointmentsCompleted: staffStats.completed,
    };
  }, [member, staffStats]);

  const handleSave = useCallback(() => {
    if (!member) return;
    onUpdate?.(member.id, formValues);
    setIsEditing(false);
  }, [member, formValues, onUpdate]);

  const handleDelete = useCallback(() => {
    if (!member) return;
    if (
      window.confirm(
        `Are you sure you want to remove ${member.firstName} ${member.lastName} from staff?`
      )
    ) {
      onDelete?.(member.id);
    }
  }, [member, onDelete]);

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
        hourlyRate: member.hourlyRate || 0,
        commissionRate: member.commissionRate || 0,
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
        {/* Performance Stats - Admin/Owner Only */}
        {isAdmin && staffStats && !isEditing && (
          <StatsSection>
            <StatsTitle>
              <Activity size={18} />
              Performance Statistics - This Month
            </StatsTitle>
            <StatsGrid>
              {/* Total Revenue */}
              <StatCard $variant="success">
                <StatHeader>
                  <StatLabel>Revenue</StatLabel>
                  <StatIcon $color="#15803d">
                    <DollarSign size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#15803d">
                  ${staffStats.totalRevenue.toLocaleString()}
                </StatValue>
                <StatSubtext>{staffStats.completed} completed</StatSubtext>
              </StatCard>

              {/* Utilization Rate */}
              <StatCard
                $variant={
                  staffStats.utilizationRate >= 80
                    ? "success"
                    : staffStats.utilizationRate >= 60
                    ? "warning"
                    : "danger"
                }
              >
                <StatHeader>
                  <StatLabel>Utilization</StatLabel>
                  <StatIcon
                    $color={
                      staffStats.utilizationRate >= 80
                        ? "#15803d"
                        : staffStats.utilizationRate >= 60
                        ? "#ca8a04"
                        : "#dc2626"
                    }
                  >
                    <Percent size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue
                  $color={
                    staffStats.utilizationRate >= 80
                      ? "#15803d"
                      : staffStats.utilizationRate >= 60
                      ? "#ca8a04"
                      : "#dc2626"
                  }
                >
                  {staffStats.utilizationRate.toFixed(0)}%
                </StatValue>
                <StatSubtext>
                  {staffStats.totalHours.toFixed(1)}h worked
                </StatSubtext>
              </StatCard>

              {/* Average Rating */}
              <StatCard $variant="info">
                <StatHeader>
                  <StatLabel>Avg Rating</StatLabel>
                  <StatIcon $color="#2563eb">
                    <Star size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#2563eb">
                  {staffStats.avgRating.toFixed(1)}
                </StatValue>
                <StatSubtext>⭐ client feedback</StatSubtext>
              </StatCard>

              {/* Total Appointments */}
              <StatCard $variant="info">
                <StatHeader>
                  <StatLabel>Appointments</StatLabel>
                  <StatIcon $color="#2563eb">
                    <Calendar size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#2563eb">
                  {staffStats.totalAppointments}
                </StatValue>
                <StatSubtext>{staffStats.upcoming} upcoming</StatSubtext>
              </StatCard>

              {/* Client Retention */}
              <StatCard $variant="success">
                <StatHeader>
                  <StatLabel>Clients</StatLabel>
                  <StatIcon $color="#15803d">
                    <Users size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#15803d">
                  {staffStats.uniqueClients}
                </StatValue>
                <StatSubtext>
                  {staffStats.retentionRate.toFixed(0)}% retention
                </StatSubtext>
              </StatCard>

              {/* No-Show Rate */}
              <StatCard
                $variant={
                  staffStats.noShowRate <= 5
                    ? "success"
                    : staffStats.noShowRate <= 10
                    ? "warning"
                    : "danger"
                }
              >
                <StatHeader>
                  <StatLabel>No-Show Rate</StatLabel>
                  <StatIcon
                    $color={
                      staffStats.noShowRate <= 5
                        ? "#15803d"
                        : staffStats.noShowRate <= 10
                        ? "#ca8a04"
                        : "#dc2626"
                    }
                  >
                    <AlertCircle size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue
                  $color={
                    staffStats.noShowRate <= 5
                      ? "#15803d"
                      : staffStats.noShowRate <= 10
                      ? "#ca8a04"
                      : "#dc2626"
                  }
                >
                  {staffStats.noShowRate.toFixed(1)}%
                </StatValue>
                <StatSubtext>{staffStats.noShow} no-shows</StatSubtext>
              </StatCard>

              {/* Cancelled */}
              <StatCard $variant="warning">
                <StatHeader>
                  <StatLabel>Cancelled</StatLabel>
                  <StatIcon $color="#ca8a04">
                    <X size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue $color="#ca8a04">{staffStats.cancelled}</StatValue>
                <StatSubtext>this month</StatSubtext>
              </StatCard>

              {/* Hours Worked */}
              <StatCard>
                <StatHeader>
                  <StatLabel>Hours Worked</StatLabel>
                  <StatIcon $color="#6b7280">
                    <Clock size={18} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{staffStats.totalHours.toFixed(1)}</StatValue>
                <StatSubtext>this month</StatSubtext>
              </StatCard>
            </StatsGrid>
          </StatsSection>
        )}

        {/* Payroll Section - Admin/Owner Only */}
        {isAdmin && payrollData && !isEditing && (
          <PayrollSection>
            <PayrollTitle>
              <DollarSign size={18} />
              Payroll Summary - This Month
            </PayrollTitle>
            <PayrollGrid>
              <PayrollCard>
                <PayrollLabel>Hourly Wages</PayrollLabel>
                <PayrollValue>
                  ${payrollData.hourlyWages.toFixed(2)}
                </PayrollValue>
                <PayrollDetail>
                  ${member.hourlyRate}/hr × {payrollData.hoursWorked.toFixed(1)}
                  h
                </PayrollDetail>
              </PayrollCard>

              <PayrollCard>
                <PayrollLabel>Commission</PayrollLabel>
                <PayrollValue>
                  ${payrollData.commission.toFixed(2)}
                </PayrollValue>
                <PayrollDetail>
                  {member.commissionRate}% of $
                  {staffStats!.totalRevenue.toFixed(0)}
                </PayrollDetail>
              </PayrollCard>

              <PayrollCard>
                <PayrollLabel>Total Earnings</PayrollLabel>
                <PayrollValue style={{ color: "#15803d" }}>
                  ${payrollData.totalEarnings.toFixed(2)}
                </PayrollValue>
                <PayrollDetail>
                  {payrollData.appointmentsCompleted} appointments completed
                </PayrollDetail>
              </PayrollCard>
            </PayrollGrid>
          </PayrollSection>
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
            <FormField>
              <Label htmlFor="staff-status">Status</Label>
              {isEditing ? (
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
              ) : (
                <ReadOnlyField>
                  <Activity size={16} />
                  {formValues.status.replace("_", " ")}
                </ReadOnlyField>
              )}
            </FormField>
          </InfoGrid>

          {/* Payroll Information - Admin Only */}
          {isAdmin && (
            <InfoGrid>
              <FormField>
                <Label htmlFor="staff-hourly-rate">Hourly Rate ($)</Label>
                {isEditing ? (
                  <Input
                    id="staff-hourly-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formValues.hourlyRate ?? 0}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        hourlyRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                ) : (
                  <ReadOnlyField>
                    <DollarSign size={16} />$
                    {member.hourlyRate?.toFixed(2) || "0.00"}/hour
                  </ReadOnlyField>
                )}
              </FormField>

              <FormField>
                <Label htmlFor="staff-commission-rate">
                  Commission Rate (%)
                </Label>
                {isEditing ? (
                  <Input
                    id="staff-commission-rate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formValues.commissionRate ?? 0}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        commissionRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                ) : (
                  <ReadOnlyField>
                    <Percent size={16} />
                    {member.commissionRate?.toFixed(1) || "0.0"}% commission
                  </ReadOnlyField>
                )}
              </FormField>
            </InfoGrid>
          )}
          {/* Hire Date */}
          <FormField>
            <Label htmlFor="staff-hire-date">Hire Date</Label>
            {isEditing ? (
              <Input
                id="staff-hire-date"
                type="date"
                value={formValues.hireDate}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    hireDate: e.target.value,
                  }))
                }
              />
            ) : member.hireDate ? (
              <ReadOnlyField>
                <Calendar size={16} />
                {new Date(member.hireDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </ReadOnlyField>
            ) : (
              <ReadOnlyField>
                <Calendar size={16} />
                Not provided
              </ReadOnlyField>
            )}
          </FormField>

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
                <>
                  <Button
                    variation="primary"
                    type="button"
                    onClick={handleBookStaff}
                  >
                    <Calendar size={16} />
                    Book with {member.firstName}
                  </Button>
                  {isAdmin && (
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
                </>
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
                      updating ||
                      !formValues.firstName ||
                      !formValues.lastName ||
                      !formValues.role
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
