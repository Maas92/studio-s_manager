import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import styled from "styled-components";
import { listTreatments, createTreatment, type Treatment } from "./api";

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

export default function Treatments() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["treatments"],
    queryFn: listTreatments,
  });
  const rows: Treatment[] = Array.isArray(data) ? data : [];

  const { register, handleSubmit, reset } = useForm<Omit<Treatment, "id">>({
    defaultValues: { name: "", durationMinutes: 60, price: 0 },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createTreatment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments"] });
      reset();
    },
  });

  return (
    <Grid>
      <Card>
        <h2>Treatments</h2>
        {isLoading ? (
          <p>Loading…</p>
        ) : isError ? (
          <p>Error loading treatments.</p>
        ) : rows.length === 0 ? (
          <p>No treatments found.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Duration</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.durationMinutes} min</td>
                  <td>
                    {Number.isFinite(t.price) ? `$${t.price.toFixed(2)}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <h3>Add treatment</h3>
        <form onSubmit={handleSubmit((v) => mutate({ ...v, price: v.price }))}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Name
              <input {...register("name", { required: true })} />
            </label>
            <label>
              Duration (min)
              <input
                type="number"
                {...register("durationMinutes", {
                  valueAsNumber: true,
                  min: 1,
                })}
              />
            </label>
            <label>
              Price
              <input
                type="number"
                step="0.01"
                {...register("price", { valueAsNumber: true, min: 0 })}
              />
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
