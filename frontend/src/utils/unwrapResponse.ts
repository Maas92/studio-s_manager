import { ZodType, ZodError } from "zod";

/**
 * Dev-only error logger
 * Silences all logs in production
 */
const isDev =
  typeof import.meta !== "undefined"
    ? import.meta.env?.DEV
    : process.env.NODE_ENV !== "production";

function devError(...args: unknown[]) {
  if (isDev) {
    console.error(...args);
  }
}

/**
 * Intelligently extracts data from various API response formats
 * Handles both wrapped and unwrapped responses
 */
export function unwrapResponse<T = any>(raw: unknown): T | T[] | null {
  if (raw == null) return null;

  // Handle axios response wrapper
  const maybeAxios = (raw as any).data ?? raw;

  // Handle nested .data wrapper
  let payload = maybeAxios;
  if (maybeAxios && typeof maybeAxios === "object" && "data" in maybeAxios) {
    payload = maybeAxios.data;
  }

  // If it's already an array, return it
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  // If it's not an object, return as-is
  if (!payload || typeof payload !== "object") {
    return payload as T;
  }

  // Common wrapper keys to check (in order of priority)
  const wrapperKeys = [
    "staff", // Added specific resource keys first
    "clients",
    "treatments",
    "appointments",
    "products",
    "transactions",
    "items",
    "results",
    "records",
    "data", // Generic keys last
    "payload",
    "content",
    "body",
  ];

  // Check for common wrapper keys
  for (const key of wrapperKeys) {
    const value = (payload as any)[key];
    if (value !== undefined && value !== null) {
      // If we found a value, recursively unwrap in case it's nested further
      if (typeof value === "object" && !Array.isArray(value)) {
        // Check if this nested object contains array data
        const nestedArrayKeys = [
          "staff",
          "clients",
          "treatments",
          "appointments",
          "products",
          "items",
          "results",
        ];
        for (const nestedKey of nestedArrayKeys) {
          if (nestedKey in value && Array.isArray(value[nestedKey])) {
            return value[nestedKey] as T[];
          }
        }
      }
      return Array.isArray(value) ? (value as T[]) : (value as T);
    }
  }

  // Indicators that this is actual data, not a wrapper
  const dataIndicators = [
    "id",
    "_id",
    "uuid",
    "name",
    "email",
    "firstName",
    "lastName",
  ];
  const hasDataIndicators = dataIndicators.some(
    (key) => key in (payload as object)
  );

  if (hasDataIndicators) {
    return payload as T;
  }

  // Check if this object has pagination metadata (total, page, etc.)
  // If so, look for the actual data in common array keys
  const hasPaginationMetadata = ["total", "page", "totalPages", "limit"].some(
    (key) => key in (payload as object)
  );

  if (hasPaginationMetadata) {
    const arrayKeys = [
      "staff",
      "clients",
      "treatments",
      "appointments",
      "products",
      "items",
      "results",
      "records",
      "data",
    ];
    for (const key of arrayKeys) {
      const value = (payload as any)[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }

  // Single-key wrapper fallback
  const keys = Object.keys(payload);
  if (keys.length === 1) {
    const singleKey = keys[0];
    const value = (payload as any)[singleKey];
    if (value !== undefined && value !== null) {
      return Array.isArray(value) ? (value as T[]) : (value as T);
    }
  }

  return payload as T;
}

/**
 * Unwrap and validate with Zod schema
 * Automatically handles both single items and arrays
 */
export function unwrapAndValidate<T>(raw: unknown, schema: ZodType<T[]>): T[];
export function unwrapAndValidate<T>(raw: unknown, schema: ZodType<T>): T;
export function unwrapAndValidate<T>(
  raw: unknown,
  schema: ZodType<T> | ZodType<T[]>
): T | T[] {
  const unwrapped = unwrapResponse<T>(raw);

  if (unwrapped == null) {
    devError("[unwrapAndValidate] No payload found in API response");
    devError("Raw response:", raw);
    throw new Error("No payload found in API response");
  }

  const isArraySchema = (schema as any)?._def?.typeName === "ZodArray";

  try {
    if (Array.isArray(unwrapped)) {
      if (isArraySchema) {
        return (schema as ZodType<T[]>).parse(unwrapped);
      } else {
        const itemSchema = schema as ZodType<T>;
        return unwrapped.map((item) => itemSchema.parse(item));
      }
    } else {
      if (isArraySchema) {
        const innerSchema = (schema as any)._def.type;
        const validatedItem = innerSchema.parse(unwrapped);
        return [validatedItem] as T[];
      } else {
        return (schema as ZodType<T>).parse(unwrapped);
      }
    }
  } catch (err) {
    if (err instanceof ZodError) {
      devError("[unwrapAndValidate] ❌ Validation failed");
      devError("━".repeat(80));
      devError("Expected schema type:", isArraySchema ? "Array" : "Object");
      devError(
        "Received data type:",
        Array.isArray(unwrapped) ? "Array" : typeof unwrapped
      );
      devError("Raw response:", JSON.stringify(raw, null, 2));
      devError("Unwrapped data:", JSON.stringify(unwrapped, null, 2));
      devError("━".repeat(80));
      devError("Validation errors:");

      err.issues.forEach((issue, index) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        devError(`  ${index + 1}. Path: ${path}`);
        devError(`     Code: ${issue.code}`);
        devError(`     Message: ${issue.message}`);

        if (issue.code === "invalid_type") {
          const expected = (issue as any).expected;
          const received = (issue as any).received;
          devError(`     Expected: ${expected}`);
          devError(`     Received: ${received}`);
        }

        if ((issue as any).validation) {
          devError(`     Validation: ${(issue as any).validation}`);
        }
      });

      devError("━".repeat(80));
    }
    throw err;
  }
}

/**
 * Unwrap response for array data specifically
 * Ensures the result is always an array
 */
export function unwrapArrayResponse<T>(raw: unknown): T[] {
  const result = unwrapResponse<T>(raw);

  if (result === null) return [];
  if (Array.isArray(result)) return result;

  return [result];
}

/**
 * Unwrap response for single item specifically
 * Extracts first item if array is received
 */
export function unwrapSingleResponse<T>(raw: unknown): T | null {
  const result = unwrapResponse<T>(raw);

  if (result === null) return null;
  if (Array.isArray(result)) return result[0] ?? null;

  return result;
}

/**
 * Check if response contains paginated data
 */
export function isPaginatedResponse(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;

  const obj = (raw as any).data ?? raw;

  return (
    obj &&
    typeof obj === "object" &&
    ("total" in obj || "count" in obj || "page" in obj || "hasMore" in obj)
  );
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  totalPages?: number;
}

export function extractPaginationMetadata(
  raw: unknown
): PaginationMetadata | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = (raw as any).data ?? raw;
  if (!obj || typeof obj !== "object") return null;

  const metadata: PaginationMetadata = {};

  if ("total" in obj) metadata.total = obj.total;
  else if ("count" in obj) metadata.total = obj.count;
  else if ("totalCount" in obj) metadata.total = obj.totalCount;

  if ("page" in obj) metadata.page = obj.page;
  else if ("currentPage" in obj) metadata.page = obj.currentPage;

  if ("pageSize" in obj) metadata.pageSize = obj.pageSize;
  else if ("perPage" in obj) metadata.pageSize = obj.perPage;
  else if ("limit" in obj) metadata.pageSize = obj.limit;

  if ("hasMore" in obj) metadata.hasMore = obj.hasMore;
  else if ("hasNext" in obj) metadata.hasMore = obj.hasNext;

  if ("totalPages" in obj) metadata.totalPages = obj.totalPages;
  else if (metadata.total && metadata.pageSize) {
    metadata.totalPages = Math.ceil(metadata.total / metadata.pageSize);
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

/**
 * Type guard to check if response is wrapped
 */
export function isWrappedResponse(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;

  const wrapperKeys = ["data", "items", "results", "records", "payload"];
  return wrapperKeys.some((key) => key in (raw as object));
}

export default {
  unwrapResponse,
  unwrapAndValidate,
  unwrapArrayResponse,
  unwrapSingleResponse,
  isPaginatedResponse,
  extractPaginationMetadata,
  isWrappedResponse,
};
