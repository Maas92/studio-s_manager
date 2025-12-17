import React, { useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import {
  User,
  Search,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Users,
  CheckCircle,
} from "lucide-react";

import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import Card from "../../ui/components/Card";

// ============================================================================
// TYPES
// ============================================================================

interface Staff {
  id: string;
  name: string;
  role: string;
  specialties?: string[];
  available: boolean;
}

interface CartItem {
  id: string;
  type: string;
  name: string;
  price: number;
  quantity: number;
  clientName?: string;
  duration?: number;
  staffId?: string;
  staffName?: string;
}

interface StaffAssignmentProps {
  cart: CartItem[];
  staff: Staff[];
  onAssignStaff: (
    itemId: string,
    itemType: string,
    staffId: string,
    staffName: string
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  display: grid;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 0.5rem;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin: 0;
`;

const ProgressIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 1px solid ${({ theme }) => theme.color.brand200};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1.5rem;
`;

const ProgressText = styled.div`
  flex: 1;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};

  span {
    color: ${({ theme }) => theme.color.brand600};
    font-weight: 700;
  }
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 8px;
  background: ${({ theme }) => theme.color.grey200};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.brand500},
    ${({ theme }) => theme.color.brand600}
  );
  width: ${({ $progress }) => $progress}%;
  transition: width 0.3s ease;
`;

const TreatmentsList = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const TreatmentCard = styled(Card)<{ $assigned: boolean }>`
  padding: 1.5rem;
  border: 2px solid
    ${({ $assigned, theme }) =>
      $assigned ? theme.color.green500 : theme.color.border};
  background: ${({ $assigned, theme }) =>
    $assigned ? theme.color.green200 : theme.color.panel};
`;

const TreatmentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const TreatmentInfo = styled.div`
  flex: 1;
`;

const TreatmentName = styled.div`
  font-weight: 700;
  font-size: 1.125rem;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.375rem;
`;

const TreatmentMeta = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const StatusBadge = styled.div<{ $assigned: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ $assigned, theme }) =>
    $assigned ? theme.color.green100 : theme.color.red100};
  color: ${({ $assigned, theme }) =>
    $assigned ? theme.color.green700 : theme.color.red600};
  border: 1px solid
    ${({ $assigned, theme }) =>
      $assigned ? theme.color.green500 : theme.color.red500};
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.875rem;
  font-weight: 700;
`;

const AssignedStaffDisplay = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 1px solid ${({ theme }) => theme.color.brand200};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StaffInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StaffAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.brand500};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
`;

const StaffDetails = styled.div``;

const StaffLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
`;

const StaffName = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

const SearchBar = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.color.mutedText};
  pointer-events: none;
  z-index: 1;
`;

const StaffGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  max-height: 320px;
  overflow-y: auto;
  padding: 0.25rem;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.color.grey100};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.grey400};
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StaffCard = styled.button<{ $selected: boolean; $disabled: boolean }>`
  padding: 1.25rem;
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.brand500 : theme.color.panel};
  color: ${({ $selected }) => ($selected ? "#ffffff" : "inherit")};
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.color.brand600 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: ${({ theme }) => theme.shadowSm};

  &:hover:not(:disabled) {
    transform: ${({ $selected }) => ($selected ? "none" : "translateY(-2px)")};
    border-color: ${({ theme }) => theme.color.brand500};
    background: ${({ $selected, theme }) =>
      $selected ? theme.color.brand600 : theme.color.brand50};
    box-shadow: ${({ theme }) => theme.shadowMd};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const StaffCardAvatar = styled.div<{ $selected: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $selected, theme }) =>
    $selected ? "rgba(255,255,255,0.3)" : theme.color.brand100};
  color: ${({ $selected, theme }) =>
    $selected ? "white" : theme.color.brand700};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.125rem;
  margin: 0 auto;
  border: 2px solid
    ${({ $selected }) => ($selected ? "rgba(255,255,255,0.5)" : "transparent")};
`;

const StaffCardName = styled.div`
  font-weight: 700;
  font-size: 0.9375rem;
`;

const StaffCardRole = styled.div`
  font-size: 0.8125rem;
  opacity: 0.85;
`;

const AvailabilityBadge = styled.div<{ $available: boolean }>`
  padding: 0.25rem 0.625rem;
  background: ${({ $available }) =>
    $available ? "rgba(52, 211, 153, 0.2)" : "rgba(107, 114, 128, 0.2)"};
  color: ${({ $available }) => ($available ? "#10b981" : "#6b7280")};
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
  grid-column: 1 / -1;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  padding-top: 1rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.red100};
  border: 1px solid ${({ theme }) => theme.color.red500};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.red600};
  font-size: 0.875rem;
  margin-top: 1rem;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

export default function StaffAssignment({
  cart,
  staff,
  onAssignStaff,
  onNext,
  onBack,
}: StaffAssignmentProps) {
  const [expandedTreatment, setExpandedTreatment] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Filter treatments only (not products)
  const treatments = useMemo(
    () =>
      cart.filter(
        (item) => item.type === "treatment" || item.type === "appointment"
      ),
    [cart]
  );

  // Check assignment progress
  const assignedCount = useMemo(
    () => treatments.filter((item) => item.staffId).length,
    [treatments]
  );

  const allAssigned = useMemo(
    () => treatments.every((item) => item.staffId),
    [treatments]
  );

  const progress = useMemo(
    () =>
      treatments.length > 0 ? (assignedCount / treatments.length) * 100 : 0,
    [assignedCount, treatments.length]
  );

  // Filter staff
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const query = searchQuery.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.role.toLowerCase().includes(query) ||
        s.specialties?.some((spec) => spec.toLowerCase().includes(query))
    );
  }, [staff, searchQuery]);

  const handleSelectStaff = useCallback(
    (item: CartItem, staffMember: Staff) => {
      onAssignStaff(item.id, item.type, staffMember.id, staffMember.name);
      setExpandedTreatment(null);
      setSearchQuery("");
    },
    [onAssignStaff]
  );

  const handleNext = useCallback(() => {
    if (!allAssigned) {
      // This shouldn't happen due to button disabled state, but just in case
      return;
    }
    onNext();
  }, [allAssigned, onNext]);

  // Get staff initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (treatments.length === 0) {
    return (
      <Container>
        <Header>
          <Title>Staff Assignment</Title>
          <Subtitle>No treatments require staff assignment</Subtitle>
        </Header>

        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <CheckCircle
            size={64}
            style={{ margin: "0 auto 1rem", opacity: 0.3 }}
          />
          <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
            All set!
          </p>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              color: "var(--color-mutedText)",
            }}
          >
            Your cart only contains products, so no staff assignment is needed.
          </p>
        </Card>

        <Actions>
          <Button
            variation="secondary"
            size="large"
            onClick={onBack}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <ArrowLeft size={18} />
            Back
          </Button>
          <Button
            variation="primary"
            size="large"
            onClick={onNext}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Continue to Payment
            <ArrowRight size={18} />
          </Button>
        </Actions>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Assign Staff Members</Title>
        <Subtitle>
          Assign a therapist to each treatment before proceeding to checkout
        </Subtitle>
      </Header>

      <ProgressIndicator>
        <Users size={20} />
        <ProgressText>
          <span>
            {assignedCount} of {treatments.length}
          </span>{" "}
          treatments assigned
        </ProgressText>
        <ProgressBar>
          <ProgressFill $progress={progress} />
        </ProgressBar>
      </ProgressIndicator>

      <TreatmentsList>
        {treatments.map((item) => {
          const key = `${item.id}-${item.type}`;
          const isExpanded = expandedTreatment === key;
          const isAssigned = !!item.staffId;

          return (
            <TreatmentCard key={key} $assigned={isAssigned}>
              <TreatmentHeader>
                <TreatmentInfo>
                  <TreatmentName>{item.name}</TreatmentName>
                  <TreatmentMeta>
                    {item.clientName && `Client: ${item.clientName}`}
                    {item.duration && ` • ${item.duration} min`}
                    {item.price && ` • $${item.price.toFixed(2)}`}
                  </TreatmentMeta>
                </TreatmentInfo>
                <StatusBadge $assigned={isAssigned}>
                  {isAssigned ? (
                    <>
                      <Check size={16} />
                      Assigned
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      Not Assigned
                    </>
                  )}
                </StatusBadge>
              </TreatmentHeader>

              {/* Show assigned staff */}
              {isAssigned && !isExpanded && (
                <AssignedStaffDisplay>
                  <StaffInfo>
                    <StaffAvatar>{getInitials(item.staffName!)}</StaffAvatar>
                    <StaffDetails>
                      <StaffLabel>Assigned Therapist</StaffLabel>
                      <StaffName>{item.staffName}</StaffName>
                    </StaffDetails>
                  </StaffInfo>
                  <Button
                    variation="secondary"
                    size="small"
                    onClick={() => setExpandedTreatment(key)}
                  >
                    Change
                  </Button>
                </AssignedStaffDisplay>
              )}

              {/* Assign/Change button */}
              {!isExpanded && !isAssigned && (
                <Button
                  variation="primary"
                  size="medium"
                  onClick={() => setExpandedTreatment(key)}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <User size={16} />
                  Assign Therapist
                </Button>
              )}

              {/* Staff selection */}
              {isExpanded && (
                <>
                  <SearchBar>
                    <SearchIcon>
                      <Search size={18} />
                    </SearchIcon>
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search staff by name or role..."
                      style={{ paddingLeft: "2.75rem" }}
                      autoFocus
                    />
                  </SearchBar>

                  <StaffGrid>
                    {filteredStaff.length === 0 ? (
                      <EmptyState>
                        <User
                          size={40}
                          style={{ margin: "0 auto 0.5rem", opacity: 0.3 }}
                        />
                        <p style={{ margin: 0, fontSize: "0.875rem" }}>
                          No staff members found
                        </p>
                      </EmptyState>
                    ) : (
                      filteredStaff.map((staffMember) => (
                        <StaffCard
                          key={staffMember.id}
                          type="button"
                          $selected={item.staffId === staffMember.id}
                          $disabled={!staffMember.available}
                          disabled={!staffMember.available}
                          onClick={() => handleSelectStaff(item, staffMember)}
                        >
                          <StaffCardAvatar
                            $selected={item.staffId === staffMember.id}
                          >
                            {getInitials(staffMember.name)}
                          </StaffCardAvatar>
                          <StaffCardName>{staffMember.name}</StaffCardName>
                          <StaffCardRole>{staffMember.role}</StaffCardRole>
                          <AvailabilityBadge $available={staffMember.available}>
                            {staffMember.available
                              ? "Available"
                              : "Unavailable"}
                          </AvailabilityBadge>
                        </StaffCard>
                      ))
                    )}
                  </StaffGrid>

                  <Button
                    variation="secondary"
                    size="small"
                    onClick={() => {
                      setExpandedTreatment(null);
                      setSearchQuery("");
                    }}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: "0.75rem",
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </TreatmentCard>
          );
        })}
      </TreatmentsList>

      {!allAssigned && (
        <ErrorMessage>
          <AlertCircle size={18} />
          <div>
            <strong>Cannot proceed to payment</strong>
            <br />
            Please assign staff to all {treatments.length - assignedCount}{" "}
            remaining treatment
            {treatments.length - assignedCount !== 1 ? "s" : ""}.
          </div>
        </ErrorMessage>
      )}

      <Actions>
        <Button
          variation="secondary"
          size="large"
          onClick={onBack}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <ArrowLeft size={18} />
          Back
        </Button>
        <Button
          variation="primary"
          size="large"
          onClick={handleNext}
          disabled={!allAssigned}
          style={{ flex: 1, justifyContent: "center" }}
        >
          {allAssigned ? (
            <>
              Continue to Payment
              <ArrowRight size={18} />
            </>
          ) : (
            <>
              <AlertCircle size={18} />
              Assign All Staff First
            </>
          )}
        </Button>
      </Actions>
    </Container>
  );
}
