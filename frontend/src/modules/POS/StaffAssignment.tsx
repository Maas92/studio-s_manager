import React, { useState, useMemo } from "react";
import styled from "styled-components";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import {
  User,
  Search,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import type { CartItem } from "./api";

interface Staff {
  id: string;
  name: string;
  role: string;
  specialties?: string[];
  available: boolean;
}

interface Step3StaffAssignmentProps {
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

const Container = styled.div`
  display: grid;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
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

const TreatmentsList = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const TreatmentCard = styled.div<{ $assigned: boolean }>`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.grey100};
  border: 2px solid
    ${({ $assigned, theme }) =>
      $assigned ? theme.color.green500 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  transition: all 0.2s;
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
    $assigned ? theme.color.green500 + "30" : theme.color.red500 + "30"};
  color: ${({ $assigned, theme }) =>
    $assigned ? theme.color.green500 : theme.color.red500};
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.875rem;
  font-weight: 700;
`;

const AssignedStaff = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 1px solid ${({ theme }) => theme.color.brand200};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StaffInfo = styled.div``;

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
`;

const StaffGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  max-height: 300px;
  overflow-y: auto;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StaffCard = styled.button<{ $selected: boolean; $disabled: boolean }>`
  padding: 1.25rem;
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.brand500 : theme.color.panel};
  color: ${({ $selected, theme }) =>
    $selected ? "#ffffff" : theme.color.text};
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.color.brand600 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: ${({ $selected }) => ($selected ? "none" : "translateY(-2px)")};
    border-color: ${({ theme }) => theme.color.brand500};
    background: ${({ $selected, theme }) =>
      $selected ? theme.color.brand600 : theme.color.brand50};
  }
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
  background: ${({ $available }) => ($available ? "#34d39930" : "#6b728030")};
  color: ${({ $available }) => ($available ? "#34d399" : "#6b7280")};
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
`;

export default function Step3StaffAssignment({
  cart,
  staff,
  onAssignStaff,
  onNext,
  onBack,
}: Step3StaffAssignmentProps) {
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

  // Check if all treatments have staff
  const allAssigned = useMemo(
    () => treatments.every((item) => item.staffId),
    [treatments]
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

  const handleSelectStaff = (item: CartItem, staffMember: Staff) => {
    onAssignStaff(item.id, item.type, staffMember.id, staffMember.name);
    setExpandedTreatment(null);
    setSearchQuery("");
  };

  return (
    <Container>
      <div>
        <Title>Assign Staff Members</Title>
        <Subtitle>
          Assign a therapist to each treatment before proceeding to checkout
        </Subtitle>
      </div>

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
                <AssignedStaff>
                  <StaffInfo>
                    <StaffLabel>Assigned Therapist</StaffLabel>
                    <StaffName>{item.staffName}</StaffName>
                  </StaffInfo>
                  <Button
                    variation="secondary"
                    size="small"
                    onClick={() => setExpandedTreatment(key)}
                  >
                    Change
                  </Button>
                </AssignedStaff>
              )}

              {/* Assign/Change button */}
              {!isExpanded && !isAssigned && (
                <Button
                  variation="primary"
                  onClick={() => setExpandedTreatment(key)}
                  style={{ width: "100%", justifyContent: "center" }}
                >
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
                      placeholder="Search staff..."
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
                          No staff found
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
                    onClick={() => {
                      setExpandedTreatment(null);
                      setSearchQuery("");
                    }}
                    size="small"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: "0.5rem",
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

      <Actions>
        <Button
          variation="secondary"
          icon={<ArrowLeft size={18} />}
          onClick={onBack}
          style={{ flex: 1, justifyContent: "center", padding: "1rem" }}
        >
          Back
        </Button>
        <Button
          variation="primary"
          icon={<ArrowRight size={18} />}
          onClick={onNext}
          disabled={!allAssigned}
          style={{ flex: 1, justifyContent: "center", padding: "1rem" }}
        >
          {allAssigned ? "Continue to Payment" : "Assign All Staff First"}
        </Button>
      </Actions>
    </Container>
  );
}
