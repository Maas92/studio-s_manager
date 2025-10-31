import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import styled from "styled-components";
import { listClients, createClient, type Client } from "./api";

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
`;
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

export default function Clients() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["clients"],
    queryFn: listClients,
  });
  const rows: Client[] = Array.isArray(data) ? data : [];

  const { register, handleSubmit, reset } = useForm<Omit<Client, "id">>({
    defaultValues: { name: "", phone: "", email: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      reset();
    },
  });

  return (
    <Grid>
      <Card>
        <h2>Clients</h2>
        {isLoading ? (
          <p>Loading…</p>
        ) : isError ? (
          <p>Error loading clients.</p>
        ) : rows.length === 0 ? (
          <p>No clients found.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone ?? "-"}</td>
                  <td>{c.email ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <h3>Add client</h3>
        <form onSubmit={handleSubmit((v) => mutate(v))}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Name
              <input {...register("name", { required: true })} />
            </label>
            <label>
              Phone
              <input {...register("phone")} />
            </label>
            <label>
              Email
              <input type="email" {...register("email")} />
            </label>
            <button disabled={isPending} type="submit">
              {isPending ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </Card>
    </Grid>
  );
}
