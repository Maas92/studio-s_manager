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

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface Booking {
  id: string | number;
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
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  deleted_at?: string;
  sync_status: SyncStatus;
  synced_at?: string;
  error_message?: string;
  retry_count?: number;
}

export interface Client {
  id: string | number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  marketing_consent: boolean;
  status: "active" | "inactive";
  sync_status: SyncStatus;
  synced_at?: string;
}

export interface Payment {
  id: string | number;
  booking_id: string | number;
  amount: number;
  payment_method: "cash" | "card" | "transfer" | "other";
  status: "pending" | "completed" | "failed" | "refunded";
  created_at: string;
  sync_status: SyncStatus;
  synced_at?: string;
}

export interface Staff {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: "admin" | "stylist" | "receptionist";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface SyncLog {
  id?: number;
  entity_type: string;
  entity_id: string | number;
  timestamp: string;
  status: "success" | "failed";
  action?: "POST" | "PUT" | "DELETE";
  error?: string;
  retry_count?: number;
}

export interface Conflict {
  id: number;
  entity_type: string;
  entity_id: string | number;
  local_data: Record<string, any>;
  server_data: Record<string, any>;
  created_at: string;
  resolution_status?: "pending" | "resolved";
}

export interface SyncEvent {
  type: "sync_start" | "sync_progress" | "sync_complete" | "sync_error";
  entityType?: string;
  total?: number;
  current?: number;
  synced?: number;
  failed?: number;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  data?: any;
  error?: string;
  synced?: number;
  failed?: number;
}

export interface ConflictDetection {
  hasConflict: boolean;
  local?: any;
  server?: any;
}

export interface OnlineStatus {
  isOnline: boolean;
  isConnected: boolean;
  checkConnectivity: () => Promise<boolean>;
}

export interface SyncStatistics {
  pending: number;
  failed: number;
  syncedToday: number;
  avgRetryCount: number;
  oldestPending: string | null;
  worker: WorkerStatus;
  connection: ConnectionStatus;
}

export interface WorkerStatus {
  isRunning: boolean;
  syncInterval: number;
  consecutiveFailures: number;
  batchSize: number;
}

export interface ConnectionStatus {
  supabase: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
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
}

export type EntityType = "bookings" | "clients" | "payments" | "staff";

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  offline?: boolean;
}

export interface ConflictResolution {
  resolution: "use_local" | "use_server" | "merge";
  data?: Record<string, any>;
}

export interface DatabaseExport {
  bookings: Booking[];
  clients: Client[];
  payments: Payment[];
  sync_log: SyncLog[];
  conflicts: Conflict[];
}
