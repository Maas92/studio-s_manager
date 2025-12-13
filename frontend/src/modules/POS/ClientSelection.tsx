import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { Calendar, User, UserPlus, Check } from "lucide-react";

import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import Card from "../../ui/components/Card";
import EmptyState from "../../ui/components/EmptyState";

const Container = styled.div`
  display: grid;
  gap: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
`;
const Row = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;
const TypeRow = styled.div`
  display: flex;
  gap: 1rem;
`;
const TypeCard = styled(Card)<{ $selected?: boolean }>`
  flex: 1;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.color.brand500 : theme.color.border};
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.brand50 : theme.color.panel};
`;
const ItemList = styled.div`
  display: grid;
  gap: 0.5rem;
  max-height: 420px;
  overflow: auto;
`;

export default function ClientSelection({
  clients,
  appointments,
  onSelectClient,
  onCreateNew,
}: {
  clients: Array<any>;
  appointments: Array<any>;
  onSelectClient: (
    clientId: string,
    clientType: "booked" | "walk-in",
    appointmentId?: string
  ) => void;
  onCreateNew: () => void;
}) {
  const [mode, setMode] = useState<"booked" | "walk-in">("booked");
  const [q, setQ] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const filteredAppointments = useMemo(() => {
    if (!q.trim()) return appointments;
    const s = q.toLowerCase();
    return appointments.filter(
      (a) =>
        (a.clientName || "").toLowerCase().includes(s) ||
        (a.treatmentName || "").toLowerCase().includes(s)
    );
  }, [appointments, q]);

  const filteredClients = useMemo(() => {
    if (!q.trim()) return clients;
    const s = q.toLowerCase();
    return clients.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(s) ||
        (c.email || "").toLowerCase().includes(s) ||
        (c.phone || "").includes(s)
    );
  }, [clients, q]);

  return (
    <Container>
      <div>
        <h2 style={{ margin: 0 }}>Select client</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Choose a booked appointment or a walk-in client
        </p>
      </div>

      <TypeRow>
        <TypeCard
          $selected={mode === "booked"}
          onClick={() => {
            setMode("booked");
            setSelectedAppointmentId(null);
            setSelectedClientId(null);
          }}
        >
          <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
            <Calendar size={34} />
            <div style={{ fontWeight: 700 }}>Booked</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Select today's appointment
            </div>
          </div>
        </TypeCard>

        <TypeCard
          $selected={mode === "walk-in"}
          onClick={() => {
            setMode("walk-in");
            setSelectedAppointmentId(null);
            setSelectedClientId(null);
          }}
        >
          <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
            <User size={34} />
            <div style={{ fontWeight: 700 }}>Walk-in</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Search or create a client
            </div>
          </div>
        </TypeCard>
      </TypeRow>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search clients, appointments or treatments..."
      />

      {mode === "booked" ? (
        <div>
          <ItemList>
            {filteredAppointments.length === 0 ? (
              <EmptyState
                title={q ? "No appointments found" : "No appointments today"}
              />
            ) : (
              filteredAppointments.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => {
                    setSelectedAppointmentId(apt.id);
                    setSelectedClientId(apt.clientId);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${
                      selectedAppointmentId === apt.id
                        ? "var(--brand500)"
                        : "var(--border)"
                    }`,
                    background:
                      selectedAppointmentId === apt.id
                        ? "var(--brand50)"
                        : "var(--panel)",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{apt.clientName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {apt.treatmentName} • {apt.time}
                    </div>
                  </div>
                  <div style={{ display: "grid", placeItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>
                      ${(apt.price ?? 0).toFixed(2)}
                    </div>
                    {selectedAppointmentId === apt.id && (
                      <div style={{ fontSize: 12, color: "var(--brand700)" }}>
                        Selected
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </ItemList>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button
              variation="primary"
              onClick={() =>
                selectedAppointmentId &&
                onSelectClient(
                  selectedClientId!,
                  "booked",
                  selectedAppointmentId
                )
              }
            >
              Check in & continue
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <ItemList>
            {filteredClients.length === 0 ? (
              <EmptyState
                title={q ? "No clients found" : "No clients yet"}
                actionText="Create client"
                onAction={onCreateNew}
              />
            ) : (
              filteredClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedClientId(c.id);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${
                      selectedClientId === c.id
                        ? "var(--brand500)"
                        : "var(--border)"
                    }`,
                    background:
                      selectedClientId === c.id
                        ? "var(--brand50)"
                        : "var(--panel)",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {c.email ?? c.phone ?? "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>
                      {c.loyaltyPoints ?? 0} pts
                    </div>
                    {selectedClientId === c.id && (
                      <div style={{ fontSize: 12, color: "var(--brand700)" }}>
                        Selected
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </ItemList>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button
              variation="secondary"
              onClick={onCreateNew}
              icon={<UserPlus />}
            >
              Create New
            </Button>
            <Button
              variation="primary"
              onClick={() =>
                selectedClientId && onSelectClient(selectedClientId, "walk-in")
              }
            >
              Verify & continue
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}
