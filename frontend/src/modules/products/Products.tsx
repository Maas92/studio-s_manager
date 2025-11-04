import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormRow } from "../../ui/components/Form";
import Input from "../../ui/components/Input";
import Button from "../../ui/components/Button";
import { createProduct, listProducts, type Product } from "./api";
import { Table } from "lucide-react";
import { useForm } from "react-hook-form";
import Row from "../../ui/components/Row";
import H from "../../ui/components/Heading";

export default function Products() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });
  const rows: Product[] = Array.isArray(data) ? data : [];

  const { register, handleSubmit, reset } = useForm<Omit<Product, "id">>({
    defaultValues: { name: "", sku: "", price: 0, retail: true },
  });

  const { mutate, isPending } = useMutation<
    Product,
    unknown,
    Omit<Product, "id">
  >({
    mutationFn: createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      reset();
    },
  });

  return (
    <Row>
      <div>
        <H>Products</H>
        {isLoading ? (
          <p>Loading…</p>
        ) : isError ? (
          <p>Error loading products.</p>
        ) : rows.length === 0 ? (
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
              {rows.map((p) => (
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
      </div>

      <div>
        <H as="h3">Add product</H>
        <Form onSubmit={handleSubmit((v) => mutate({ ...v, price: v.price }))}>
          <FormRow>
            <label htmlFor="sku">SKU</label>
            <Input id="sku" {...register("sku", { required: true })} />
          </FormRow>
          <FormRow>
            <label htmlFor="name">Name</label>
            <Input id="name" {...register("name", { required: true })} />
          </FormRow>
          <FormRow>
            <label htmlFor="price">Price</label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register("price", { valueAsNumber: true, min: 0 })}
            />
          </FormRow>
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Create"}
            </Button>
          </div>
        </Form>
      </div>
    </Row>
  );
}
