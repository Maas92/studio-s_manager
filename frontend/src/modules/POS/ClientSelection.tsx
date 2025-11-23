import React, { useState, useMemo } from "react";
import styled from "styled-components";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import {
  User,
  Calendar,
  Search,
  UserPlus,
  ArrowRight,
  Check,
  AlertCircle,
  Phone,
  Mail,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  loyaltyPoints: number;
}

interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  treatmentName: string;
  time: string;
  staffName: string;
}

interface ClientSelectionProps {
  clients: Client[];
  appointments: Appointment[];
  onSelectClient: (
    clientId: string,
    clientType: "booked" | "walk-in",
    appointmentId?: string,
    verified?: boolean
  ) => void;
  onCreateNew: () => void;
}

const Container = styled.div`
  display: grid;
  gap: 2rem;
  max-width: 900px;
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
  margin: 0 0 2rem 0;
`;

const TypeSelection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
`;

const TypeCard = styled.button<{ $selected: boolean }>`
  padding: 2.5rem 2rem;
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.brand50 : theme.color.grey100};
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.color.brand500 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand500};
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadowLg};
  }
`;

const IconWrapper = styled.div<{ $selected: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: ${({ theme }) => theme.radii.round};
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.brand500 : theme.color.grey200};
  color: ${({ $selected }) => ($selected ? "#ffffff" : "#6b7280")};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
`;

const TypeTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

const TypeDescription = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.border};
  margin: 1rem 0;
`;

const SearchSection = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  margin: 0 0 0.5rem 0;
`;

const SectionSubtitle = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin: 0;
`;

const SearchBar = styled.div`
  position: relative;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.color.mutedText};
  pointer-events: none;
`;

const ItemGrid = styled.div`
  display: grid;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
`;

const ItemCard = styled.button<{ $highlighted?: boolean }>`
  padding: 1.25rem;
  background: ${({ $highlighted, theme }) =>
    $highlighted ? theme.color.brand50 : theme.color.grey100};
  border: 1px solid
    ${({ $highlighted, theme }) =>
      $highlighted ? theme.color.brand500 : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand500};
    background: ${({ theme }) => theme.color.brand50};
    transform: translateX(4px);
  }
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemName = styled.div`
  font-weight: 700;
  font-size: 1rem;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;
`;

const ItemDetails = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const ItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Badge = styled.div<{ $variant?: "success" | "primary" }>`
  padding: 0.5rem 1rem;
  background: ${({ $variant, theme }) =>
    $variant === "success"
      ? theme.color.green500 + "30"
      : theme.color.brand500 + "30"};
  color: ${({ $variant, theme }) =>
    $variant === "success" ? theme.color.green500 : theme.color.brand600};
  border-radius: ${({ theme }) => theme.radii.round};
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const VerificationBox = styled.div`
  padding: 1.25rem;
  background: ${({ theme }) => theme.color.yellow100};
  border: 1px solid ${({ theme }) => theme.color.yellow700};
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  align-items: start;
  gap: 0.75rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
`;

export default function ClientSelection({
  clients,
  appointments,
  onSelectClient,
  onCreateNew,
}: ClientSelectionProps) {
  const [clientType, setClientType] = useState<"booked" | "walk-in" | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [requiresVerification, setRequiresVerification] = useState(false);

  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const query = searchQuery.toLowerCase();
    return appointments.filter(
      (apt) =>
        apt.clientName.toLowerCase().includes(query) ||
        apt.treatmentName.toLowerCase().includes(query)
    );
  }, [appointments, searchQuery]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.phone?.includes(query)
    );
  }, [clients, searchQuery]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId);
  }, [selectedClientId, clients]);

  const handleSelectAppointment = (apt: Appointment) => {
    setSelectedClientId(apt.clientId);
    setSelectedAppointmentId(apt.id);
    setRequiresVerification(false);
  };

  const handleSelectWalkInClient = (client: Client) => {
    setSelectedClientId(client.id);
    setRequiresVerification(true);
  };

  const handleConfirmVerification = () => {
    if (selectedClientId) {
      onSelectClient(
        selectedClientId,
        clientType!,
        selectedAppointmentId || undefined,
        true
      );
    }
  };

  const handleContinueBooked = () => {
    if (selectedClientId && selectedAppointmentId) {
      onSelectClient(selectedClientId, "booked", selectedAppointmentId, true);
    }
  };

  return (
    <Container>
      <div>
        <Title>Select Client Type</Title>
        <Subtitle>
          Choose whether this is a booked appointment or a walk-in customer
        </Subtitle>
      </div>

      <TypeSelection>
        <TypeCard
          type="button"
          $selected={clientType === "booked"}
          onClick={() => {
            setClientType("booked");
            setSelectedClientId(null);
            setSelectedAppointmentId(null);
            setSearchQuery("");
          }}
        >
          <IconWrapper $selected={clientType === "booked"}>
            <Calendar size={40} />
          </IconWrapper>
          <div>
            <TypeTitle>Booked Client</TypeTitle>
            <TypeDescription>Client with an appointment</TypeDescription>
          </div>
        </TypeCard>

        <TypeCard
          type="button"
          $selected={clientType === "walk-in"}
          onClick={() => {
            setClientType("walk-in");
            setSelectedClientId(null);
            setSelectedAppointmentId(null);
            setSearchQuery("");
          }}
        >
          <IconWrapper $selected={clientType === "walk-in"}>
            <User size={40} />
          </IconWrapper>
          <div>
            <TypeTitle>Walk-in Client</TypeTitle>
            <TypeDescription>Client without appointment</TypeDescription>
          </div>
        </TypeCard>
      </TypeSelection>

      {/* Booked Appointments */}
      {clientType === "booked" && (
        <>
          <Divider />
          <SearchSection>
            <div>
              <SectionTitle>Select Today's Appointment</SectionTitle>
              <SectionSubtitle>
                Choose the appointment to check in and process
              </SectionSubtitle>
            </div>

            <SearchBar>
              <SearchIcon>
                <Search size={20} />
              </SearchIcon>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client name or treatment..."
                style={{ paddingLeft: "3rem" }}
              />
            </SearchBar>

            <ItemGrid>
              {!filteredAppointments || filteredAppointments.length === 0 ? (
                <EmptyState>
                  <Calendar
                    size={48}
                    style={{ margin: "0 auto 1rem", opacity: 0.3 }}
                  />
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>
                    {searchQuery
                      ? "No appointments found"
                      : "No appointments today"}
                  </p>
                </EmptyState>
              ) : (
                filteredAppointments.map((apt) => (
                  <ItemCard
                    key={apt.id}
                    type="button"
                    $highlighted={selectedAppointmentId === apt.id}
                    onClick={() => handleSelectAppointment(apt)}
                  >
                    <ItemInfo>
                      <ItemName>{apt.clientName}</ItemName>
                      <ItemDetails>
                        <div>{apt.treatmentName}</div>
                        <ItemMeta>
                          <Calendar size={14} />
                          {apt.time}
                        </ItemMeta>
                        <ItemMeta>
                          <User size={14} />
                          {apt.staffName}
                        </ItemMeta>
                      </ItemDetails>
                    </ItemInfo>
                    {selectedAppointmentId === apt.id && (
                      <Badge $variant="success">
                        <Check size={16} style={{ marginRight: "0.25rem" }} />
                        Selected
                      </Badge>
                    )}
                  </ItemCard>
                ))
              )}
            </ItemGrid>

            {selectedAppointmentId && (
              <Actions>
                <Button
                  variation="primary"
                  icon={<ArrowRight size={20} />}
                  onClick={handleContinueBooked}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "1rem",
                    fontSize: "1rem",
                  }}
                >
                  Check In & Continue
                </Button>
              </Actions>
            )}
          </SearchSection>
        </>
      )}

      {/* Walk-in Clients */}
      {clientType === "walk-in" && (
        <>
          <Divider />
          <SearchSection>
            <div>
              <SectionTitle>Select Existing Client</SectionTitle>
              <SectionSubtitle>
                Search for an existing client or create a new one
              </SectionSubtitle>
            </div>

            <SearchBar>
              <SearchIcon>
                <Search size={20} />
              </SearchIcon>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                style={{ paddingLeft: "3rem" }}
              />
            </SearchBar>

            <ItemGrid>
              {filteredClients.length === 0 ? (
                <EmptyState>
                  <User
                    size={48}
                    style={{ margin: "0 auto 1rem", opacity: 0.3 }}
                  />
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>
                    {searchQuery ? "No clients found" : "No clients available"}
                  </p>
                </EmptyState>
              ) : (
                filteredClients.map((client) => (
                  <ItemCard
                    key={client.id}
                    type="button"
                    $highlighted={selectedClientId === client.id}
                    onClick={() => handleSelectWalkInClient(client)}
                  >
                    <ItemInfo>
                      <ItemName>{client.name}</ItemName>
                      <ItemDetails>
                        {client.email && (
                          <ItemMeta>
                            <Mail size={14} />
                            {client.email}
                          </ItemMeta>
                        )}
                        {client.phone && (
                          <ItemMeta>
                            <Phone size={14} />
                            {client.phone}
                          </ItemMeta>
                        )}
                      </ItemDetails>
                    </ItemInfo>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        alignItems: "flex-end",
                      }}
                    >
                      {selectedClientId === client.id && (
                        <Badge $variant="success">
                          <Check size={16} style={{ marginRight: "0.25rem" }} />
                          Selected
                        </Badge>
                      )}
                      <Badge $variant="primary">
                        {client.loyaltyPoints} pts
                      </Badge>
                    </div>
                  </ItemCard>
                ))
              )}
            </ItemGrid>

            {requiresVerification && selectedClient && (
              <VerificationBox>
                <AlertCircle size={20} color="#a16207" />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: "0.25rem",
                      color: "#1f2937",
                    }}
                  >
                    Verify Client Identity
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                    Please verify this is <strong>{selectedClient.name}</strong>{" "}
                    before continuing.
                  </div>
                </div>
              </VerificationBox>
            )}

            <Actions>
              <Button
                variation="secondary"
                icon={<UserPlus size={20} />}
                onClick={onCreateNew}
                style={{ flex: 1, justifyContent: "center", padding: "1rem" }}
              >
                Create New Client
              </Button>
              {requiresVerification && selectedClient && (
                <Button
                  variation="primary"
                  icon={<Check size={20} />}
                  onClick={handleConfirmVerification}
                  style={{ flex: 1, justifyContent: "center", padding: "1rem" }}
                >
                  Verify & Continue
                </Button>
              )}
            </Actions>
          </SearchSection>
        </>
      )}
    </Container>
  );
}
