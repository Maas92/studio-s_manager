import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import styled from "styled-components";
import { createProduct, listProducts, type Product } from "./api";

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

export default function Products() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const { register, handleSubmit, reset } = useForm<Omit<Product, "id">>({
    defaultValues: { name: "", sku: "", price: 0, retail: true },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      reset();
    },
  });

  const safeData: Product[] = Array.isArray(data) ? data : [];

  return (
    <Grid>
      <Card>
        <h2>Products</h2>
        {isLoading ? (
          <p>Loading…</p>
        ) : isError ? (
          <p>Error loading products.</p>
        ) : safeData.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Price</th>
                <th>Retail</th>
              </tr>
            </thead>
            <tbody>
              {safeData.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>
                    {Number.isFinite(p.price) ? `$${p.price.toFixed(2)}` : "-"}
                  </td>
                  <td>{p.retail ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <h3>Add product</h3>
        <form onSubmit={handleSubmit((v) => mutate({ ...v, price: v.price }))}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              SKU
              <input {...register("sku", { required: true })} />
            </label>
            <label>
              Name
              <input {...register("name", { required: true })} />
            </label>
            <label>
              Price
              <input
                type="number"
                step="0.01"
                {...register("price", { valueAsNumber: true, min: 0 })}
              />
            </label>
            <label>
              <input type="checkbox" {...register("retail")} /> Retail
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
