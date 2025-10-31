import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { listAppointments, type Appointment } from "./api";

const Card = styled.div`
  background: #121212;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 16px;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 10px;
    border-bottom: 1px solid #222;
  }
`;

export default function Appointments() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["appointments"],
    queryFn: listAppointments,
  });
  const rows: Appointment[] = Array.isArray(data) ? data : [];

  return (
    <Card>
      <h2>Appointments</h2>
      {isLoading ? (
        <p>Loading…</p>
      ) : isError ? (
        <p>Error loading appointments.</p>
      ) : rows.length === 0 ? (
        <p>No appointments scheduled.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Client</th>
              <th>Treatment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.datetimeISO).toLocaleString()}</td>
                <td>{a.clientName ?? a.clientId}</td>
                <td>{a.treatmentName ?? a.treatmentId}</td>
                <td>{a.status ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
