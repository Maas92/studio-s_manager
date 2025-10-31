import { api } from "../../services/api";
import { toArray } from "../../services/normalise";

type StockRow = {
  id: string;
  productId: string;
  location: string;
  qty: number;
};

export async function listStock() {
  const { data } = await api.get("/stock");
  return toArray<StockRow>(data);
}
