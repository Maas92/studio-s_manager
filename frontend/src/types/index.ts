export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "manager" | "therapist" | "receptionist";
  phone?: string;
  profileImage?: string;
  specializations?: string[];
  bio?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id?: string;
  category_name?: string;
  brand?: string;
  supplier_id?: string;
  supplier_name?: string;
  description?: string;
  unit_of_measure: string;
  unit_cost: number;
  retail_price?: number;
  reorder_level: number;
  expiry_tracking: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryLevel {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  location_id: string;
  location_name: string;
  location_type: "storage" | "retail" | "treatment_room";
  quantity_available: number;
  quantity_reserved: number;
  quantity_free: number;
  reorder_level: number;
  batch_number?: string;
  expiry_date?: string;
  last_updated: string;
}

export interface Category {
  id: string;
  name: string;
  parent_category_id?: string;
  parent_category_name?: string;
  type: "retail" | "treatment_only" | "both";
  product_count?: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  lead_time_days: number;
  is_active: boolean;
  product_count?: number;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  type: "storage" | "retail" | "treatment_room";
  description?: string;
  is_active: boolean;
  product_count?: number;
  total_items?: number;
  created_at: string;
}

export interface CreateProductData {
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
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  token: string;
  data: {
    user: User;
  };
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  results?: number;
  total?: number;
}
