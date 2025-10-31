import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { getDashboardSummary, type DashboardSummary } from "./api";

const Grid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
`;
const Card = styled.div`
  background: #121212;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;
const Big = styled.div`
  font-size: 28px;
  font-weight: 700;
`;

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });
  const s: DashboardSummary = data ?? {
    productCount: 0,
    stockItems: 0,
    treatmentCount: 0,
    clientCount: 0,
    appointmentCount: 0,
  };

  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p>Unable to load summary.</p>;

  return (
    <Grid>
      <Card>
        <div>Products</div>
        <Big>{s.productCount}</Big>
      </Card>
      <Card>
        <div>Stock Items</div>
        <Big>{s.stockItems}</Big>
      </Card>
      <Card>
        <div>Treatments</div>
        <Big>{s.treatmentCount}</Big>
      </Card>
      <Card>
        <div>Clients</div>
        <Big>{s.clientCount}</Big>
      </Card>
      <Card>
        <div>Appointments</div>
        <Big>{s.appointmentCount}</Big>
      </Card>
    </Grid>
  );
}
