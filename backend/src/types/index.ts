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
  treatment_id?: string; // Added
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
  staff_id?: string;
  staff_name?: string;
  created_at: Date;
}

export type EventType = string; // e.g., 'booking_created', 'client_updated'
export type EntityType = "bookings" | "clients" | "payments" | "staff";

export interface HealthCheck {
  id: number;
  service_name: string;
  status: string;
  checked_at: Date;
  response_time_ms: number | null;
  error_message: string | null;
}

export interface Conflict {
  id: number;
  entity_type: string;
  entity_id: string;
  local_data: Record<string, any>;
  server_data: Record<string, any>;
  resolution_status: "pending" | "resolved";
  resolved_at: Date | null;
  resolved_by: string | null;
  resolution_strategy: string | null;
  created_at: Date;
}

export interface SyncStatistics {
  pending_count: number;
  failed_count: number;
  synced_today: number;
  avg_retry_count: number;
  oldest_pending: Date | null;
}

export interface ConnectionStatus {
  supabase: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
}

export interface WorkerStatus {
  isRunning: boolean;
  syncInterval: number;
  consecutiveFailures: number;
  batchSize: number;
}

export interface WriteResult {
  success: boolean;
  offline?: boolean;
  data?: any;
  message?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "stylist" | "receptionist";
}

export interface RequestWithUser extends Express.Request {
  user?: AuthUser;
}

export interface Booking {
  id?: string | number;
  client_id: string;
  treatment_id: string;
  staff_id?: string;
  booking_date: string;
  start_time: string;
  end_time?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  treatment_location_id?: string;
  total_price?: number;
  deposit_paid?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface Client {
  id?: string | number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  is_active: boolean;
  marketing_consent: boolean;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id?: string | number;
  booking_id: string | number;
  amount: number;
  payment_method:
    | "cash"
    | "card"
    | "transfer"
    | "other"
    | "loyalty"
    | "gift-card";
  status: "pending" | "completed" | "failed" | "refunded";
  created_at?: Date;
  sale_id: string;
  reference?: string;
}

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    supabase: "online" | "offline";
    localDatabase: "online" | "offline";
    syncWorker: "running" | "stopped";
  };
  queue: {
    pending: number;
    failed: number;
  };
  error?: string;
}

export interface ConflictResolutionRequest {
  resolution: "use_local" | "use_server" | "merge";
  data?: Record<string, any>;
}
