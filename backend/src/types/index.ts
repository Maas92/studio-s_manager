export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id?: string;
  brand?: string;
  supplier_id?: string;
  description?: string;
  unit_of_measure?: string; // Made optional as it might not be in service
  cost_cents: number; // Changed from unit_cost
  price_cents: number; // Changed from retail_price
  retail: boolean; // Changed from retail_price (boolean flag?)
  active: boolean; // Changed from is_active
  reorder_level?: number;
  expiry_tracking?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryLevel {
  id: string;
  product_id: string;
  location_id: string;
  quantity_available: number;
  quantity_reserved: number;
  batch_number?: string;
  expiry_date?: Date;
  last_updated: Date;
}

export interface StockMovement {
  id: string;
  product_id: string;
  from_location_id?: string;
  to_location_id?: string;
  quantity: number;
  movement_type:
    | "transfer"
    | "adjustment"
    | "sale"
    | "usage"
    | "return"
    | "restock";
  reference_id?: string;
  reference_type?: string;
  reason?: string;
  performed_by?: string;
  batch_number?: string;
  cost_per_unit?: number;
  timestamp: Date;
}

export interface Sale {
  id: string;
  client_id?: string;
  staff_id: string;
  sale_date: Date;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  tips_total: number;
  final_amount: number;
  status: "pending" | "completed" | "cancelled" | "refunded";
  payment_status?: string;
  loyalty_points_earned: number;
  receipt_number: string;
  notes?: string;
  created_at: Date;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string; // Made optional/nullable
  service_id?: string; // Added
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
  staff_id?: string;
  staff_name?: string;
  created_at: Date;
}

export interface Payment {
  id: string;
  sale_id: string;
  method: "cash" | "card" | "loyalty" | "gift-card";
  amount: number;
  reference?: string;
  created_at: Date;
}
