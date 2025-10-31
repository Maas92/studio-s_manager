import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { listStock } from "./api";

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

export default function Stock() {
  const { data, isLoading } = useQuery({
    queryKey: ["stock"],
    queryFn: listStock,
  });
  return (
    <Card>
      <h2>Stock</h2>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Product</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r.id}>
                <td>{r.location}</td>
                <td>{r.productId}</td>
                <td>{r.qty}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
