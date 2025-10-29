export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id?: string;
  brand?: string;
  supplier_id?: string;
  description?: string;
  unit_of_measure: string;
  unit_cost: number;
  retail_price?: number;
  reorder_level: number;
  expiry_tracking: boolean;
  is_active: boolean;
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
