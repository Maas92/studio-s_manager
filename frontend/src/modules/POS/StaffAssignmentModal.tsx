import React, { useState, useMemo } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import { User, Search, Check, AlertCircle } from "lucide-react";
import type { CartItem } from "./api";

interface Staff {
  id: string;
  name: string;
  role: string;
  specialties?: string[];
  available: boolean;
}

interface StaffAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  staff: Staff[];
  onAssignStaff: (
    itemId: string,
    itemType: string,
    staffId: string,
    staffName: string
  ) => void;
}

const Content = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const TreatmentsList = styled.div`
  display: grid;
  gap: 1rem;
`;

const TreatmentCard = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.grey100};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const TreatmentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const TreatmentInfo = styled.div`
  flex: 1;
`;

const TreatmentName = styled.div`
  font-weight: 700;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;
`;

const TreatmentClient = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const StaffStatus = styled.div<{ $assigned: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: ${({ $assigned, theme }) =>
    $assigned ? theme.color.green500 + "30" : theme.color.red500 + "30"};
  color: ${({ $assigned, theme }) =>
    $assigned ? theme.color.green500 : theme.color.red500};
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.75rem;
  font-weight: 700;
`;

const SearchBar = styled.div`
  position: relative;
  margin-top: 0.75rem;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.color.mutedText};
  pointer-events: none;
`;

const StaffList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  display: grid;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const StaffCard = styled.button<{ $selected: boolean; $disabled: boolean }>`
  padding: 0.875rem;
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.brand500 : theme.color.panel};
  color: ${({ $selected, theme }) =>
    $selected ? "#ffffff" : theme.color.text};
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.color.brand600 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.brand500};
    background: ${({ $selected, theme }) =>
      $selected ? theme.color.brand600 : theme.color.brand50};
  }
`;

const StaffInfo = styled.div``;

const StaffName = styled.div`
  font-weight: 700;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
`;

const StaffRole = styled.div`
  font-size: 0.75rem;
  opacity: 0.8;
`;

const AvailabilityBadge = styled.div<{ $available: boolean }>`
  padding: 0.25rem 0.625rem;
  background: ${({ $available, theme }) =>
    $available ? theme.color.green500 + "30" : theme.color.grey300};
  color: ${({ $available, theme }) =>
    $available ? theme.color.green500 : theme.color.mutedText};
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Warning = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme }) => theme.color.yellow100};
  border: 1px solid ${({ theme }) => theme.color.yellow700};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.grey900};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
`;

export default function StaffAssignmentModal({
  isOpen,
  onClose,
  cartItems,
  staff,
  onAssignStaff,
}: StaffAssignmentModalProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempAssignments, setTempAssignments] = useState<
    Record<string, { staffId: string; staffName: string }>
  >({});

  // Get treatments from cart (not products)
  const treatments = useMemo(
    () =>
      cartItems.filter(
        (item) => item.type === "treatment" || item.type === "appointment"
      ),
    [cartItems]
  );

  // Check if all treatments have staff assigned
  const allAssigned = useMemo(() => {
    return treatments.every((item) => {
      const key = `${item.id}-${item.type}`;
      return item.staffId || tempAssignments[key];
    });
  }, [treatments, tempAssignments]);

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

  const handleSelectStaff = (
    itemId: string,
    itemType: string,
    staffId: string,
    staffName: string
  ) => {
    const key = `${itemId}-${itemType}`;
    setTempAssignments((prev) => ({
      ...prev,
      [key]: { staffId, staffName },
    }));
    setExpandedItem(null);
    setSearchQuery("");
  };

  const handleSaveAndContinue = () => {
    // Apply all temp assignments
    Object.entries(tempAssignments).forEach(([key, assignment]) => {
      const [itemId, itemType] = key.split("-");
      onAssignStaff(itemId, itemType, assignment.staffId, assignment.staffName);
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Staff Members"
      size="lg"
      ariaLabel="Assign staff to treatments"
    >
      <Content>
        {/* Warning if no treatments */}
        {treatments.length === 0 && (
          <Warning>
            <AlertCircle size={20} />
            <div>
              <strong>No treatments in cart</strong>
              <br />
              Staff assignment is only required for treatments and appointments,
              not retail products.
            </div>
          </Warning>
        )}

        {/* Treatment List */}
        <TreatmentsList>
          {treatments.map((item) => {
            const key = `${item.id}-${item.type}`;
            const assignedStaff = item.staffId || tempAssignments[key]?.staffId;
            const staffName = item.staffName || tempAssignments[key]?.staffName;
            const isExpanded = expandedItem === key;

            return (
              <TreatmentCard key={key}>
                <TreatmentHeader>
                  <TreatmentInfo>
                    <TreatmentName>{item.name}</TreatmentName>
                    {item.clientName && (
                      <TreatmentClient>{item.clientName}</TreatmentClient>
                    )}
                    {staffName && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                        }}
                      >
                        Therapist: {staffName}
                      </div>
                    )}
                  </TreatmentInfo>
                  <StaffStatus $assigned={!!assignedStaff}>
                    {assignedStaff ? (
                      <>
                        <Check size={14} />
                        Assigned
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        Not Assigned
                      </>
                    )}
                  </StaffStatus>
                </TreatmentHeader>

                {/* Staff Selection */}
                {!isExpanded && (
                  <Button
                    variation="secondary"
                    onClick={() => setExpandedItem(key)}
                    size="small"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {assignedStaff ? "Change Therapist" : "Assign Therapist"}
                  </Button>
                )}

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
                        style={{ paddingLeft: "2.5rem", fontSize: "0.875rem" }}
                        autoFocus
                      />
                    </SearchBar>

                    <StaffList>
                      {filteredStaff.length === 0 ? (
                        <EmptyState>
                          <User
                            size={40}
                            style={{ margin: "0 auto 0.5rem", opacity: 0.3 }}
                          />
                          <p style={{ margin: 0, fontSize: "0.8125rem" }}>
                            No staff members found
                          </p>
                        </EmptyState>
                      ) : (
                        filteredStaff.map((staffMember) => (
                          <StaffCard
                            key={staffMember.id}
                            type="button"
                            $selected={assignedStaff === staffMember.id}
                            $disabled={!staffMember.available}
                            disabled={!staffMember.available}
                            onClick={() =>
                              handleSelectStaff(
                                item.id,
                                item.type,
                                staffMember.id,
                                staffMember.name
                              )
                            }
                          >
                            <StaffInfo>
                              <StaffName>{staffMember.name}</StaffName>
                              <StaffRole>{staffMember.role}</StaffRole>
                            </StaffInfo>
                            <AvailabilityBadge
                              $available={staffMember.available}
                            >
                              {staffMember.available
                                ? "Available"
                                : "Unavailable"}
                            </AvailabilityBadge>
                          </StaffCard>
                        ))
                      )}
                    </StaffList>

                    <Button
                      variation="secondary"
                      onClick={() => {
                        setExpandedItem(null);
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

        {/* Actions */}
        {treatments.length > 0 && (
          <Actions>
            <Button
              variation="secondary"
              onClick={onClose}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Cancel
            </Button>
            <Button
              variation="primary"
              onClick={handleSaveAndContinue}
              disabled={!allAssigned}
              style={{ flex: 1, justifyContent: "center" }}
            >
              {allAssigned ? "Continue to Checkout" : "Assign All First"}
            </Button>
          </Actions>
        )}
      </Content>
    </Modal>
  );
}
