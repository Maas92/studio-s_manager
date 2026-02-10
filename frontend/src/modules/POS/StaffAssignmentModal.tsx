import React, { useState, useMemo } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import SearchableSelect from "../../ui/components/SearchableSelect";
import styled from "styled-components";
import { Check, AlertCircle } from "lucide-react";
import { type CartItem } from "./POSSchema";

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
    staffName: string,
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

const SelectWrapper = styled.div`
  margin-top: 0.75rem;
`;

const StaffLabel = styled.div`
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.color.text};
`;

const SelectedStaffInfo = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.color.brand50};
  border: 1px solid ${({ theme }) => theme.color.brand200};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.8125rem;
`;

const StaffDetail = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:not(:last-child) {
    margin-bottom: 0.25rem;
  }
`;

const StaffDetailLabel = styled.span`
  color: ${({ theme }) => theme.color.mutedText};
  font-weight: 600;
`;

const StaffDetailValue = styled.span`
  color: ${({ theme }) => theme.color.text};
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
  const [tempAssignments, setTempAssignments] = useState<
    Record<string, { staffId: string; staffName: string }>
  >({});

  // Get treatments from cart (not products)
  const treatments = useMemo(
    () =>
      cartItems.filter(
        (item) => item.type === "treatment" || item.type === "appointment",
      ),
    [cartItems],
  );

  // Check if all treatments have staff assigned
  const allAssigned = useMemo(() => {
    return treatments.every((item) => {
      const key = `${item.id}-${item.type}`;
      return item.staffId || tempAssignments[key];
    });
  }, [treatments, tempAssignments]);

  // Convert staff to SearchableSelect options
  const staffOptions = useMemo(() => {
    return staff.map((s) => ({
      id: s.id,
      label: `${s.name} - ${s.role}${s.available ? "" : " (Unavailable)"}`,
      // Store full staff object for later use
      _staff: s,
    }));
  }, [staff]);

  const handleSelectStaff = (
    itemId: string,
    itemType: string,
    staffId: string,
  ) => {
    const selectedStaff = staff.find((s) => s.id === staffId);
    if (!selectedStaff) return;

    const key = `${itemId}-${itemType}`;
    setTempAssignments((prev) => ({
      ...prev,
      [key]: { staffId: selectedStaff.id, staffName: selectedStaff.name },
    }));
  };

  const handleSaveAndContinue = () => {
    // Apply all temp assignments
    Object.entries(tempAssignments).forEach(([key, assignment]) => {
      const [itemId, itemType] = key.split("-");
      onAssignStaff(itemId, itemType, assignment.staffId, assignment.staffName);
    });
    onClose();
  };

  // Get currently assigned staff for an item
  const getAssignedStaffId = (item: CartItem) => {
    const key = `${item.id}-${item.type}`;
    return item.staffId || tempAssignments[key]?.staffId || "";
  };

  const getAssignedStaff = (item: CartItem) => {
    const staffId = getAssignedStaffId(item);
    return staff.find((s) => s.id === staffId);
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
            const assignedStaffId = getAssignedStaffId(item);
            const assignedStaff = getAssignedStaff(item);
            const staffName = item.staffName || tempAssignments[key]?.staffName;

            return (
              <TreatmentCard key={key}>
                <TreatmentHeader>
                  <TreatmentInfo>
                    <TreatmentName>{item.name}</TreatmentName>
                    {item.clientName && (
                      <TreatmentClient>{item.clientName}</TreatmentClient>
                    )}
                  </TreatmentInfo>
                  <StaffStatus $assigned={!!assignedStaffId}>
                    {assignedStaffId ? (
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

                {/* Staff Selection using SearchableSelect */}
                <SelectWrapper>
                  <StaffLabel>
                    {assignedStaffId
                      ? "Assigned Therapist"
                      : "Select Therapist"}
                  </StaffLabel>
                  <SearchableSelect
                    options={staffOptions}
                    value={assignedStaffId}
                    onChange={(staffId) =>
                      handleSelectStaff(item.id, item.type, staffId)
                    }
                    placeholder="Search staff by name or role..."
                    id={`staff-select-${key}`}
                    ariaLabel={`Select staff for ${item.name}`}
                    labelRenderer={(option) => {
                      const staffMember = staff.find((s) => s.id === option.id);
                      if (!staffMember) return option.label;

                      return (
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {staffMember.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                            {staffMember.role}
                            {staffMember.available ? "" : " • Unavailable"}
                          </div>
                        </div>
                      );
                    }}
                  />

                  {/* Show selected staff details */}
                  {assignedStaff && (
                    <SelectedStaffInfo>
                      <StaffDetail>
                        <StaffDetailLabel>Therapist:</StaffDetailLabel>
                        <StaffDetailValue>
                          {assignedStaff.name}
                        </StaffDetailValue>
                      </StaffDetail>
                      <StaffDetail>
                        <StaffDetailLabel>Role:</StaffDetailLabel>
                        <StaffDetailValue>
                          {assignedStaff.role}
                        </StaffDetailValue>
                      </StaffDetail>
                      {assignedStaff.specialties &&
                        assignedStaff.specialties.length > 0 && (
                          <StaffDetail>
                            <StaffDetailLabel>Specialties:</StaffDetailLabel>
                            <StaffDetailValue>
                              {assignedStaff.specialties.join(", ")}
                            </StaffDetailValue>
                          </StaffDetail>
                        )}
                    </SelectedStaffInfo>
                  )}
                </SelectWrapper>
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
