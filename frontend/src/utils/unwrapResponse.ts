import { ZodType, ZodError } from "zod";

/**
 * Unwrap possible API response wrappers into either:
 *  - a single T
 *  - an array of T
 *  - null if no payload found
 */
export function unwrapResponse<T = any>(raw: unknown): T | T[] | null {
  if (raw == null) return null;

  // If axios response object: prefer raw.data
  const maybeAxios = (raw as any).data ?? raw;

  // Some APIs wrap again under `.data`
  const payload =
    maybeAxios && (maybeAxios as any).data
      ? (maybeAxios as any).data
      : maybeAxios;

  const candidateKeys = [
    "items",
    "results",
    "records",
    "data",
    "payload",
    "treatments",
    "treatment",
    "appointment",
    "appointments",
    "client",
    "clients",
    "staff",
    "user",
    "users",
    "stock",
  ];

  // If already an array, return it
  if (Array.isArray(payload)) return payload as T[];

  // If object, look for common nested keys
  if (payload && typeof payload === "object") {
    for (const key of candidateKeys) {
      const v = (payload as any)[key];
      if (v !== undefined && v !== null) {
        return Array.isArray(v) ? (v as T[]) : (v as T);
      }
    }

    // try one deeper: payload.data.whatever
    const deeper = (payload as any).data;
    if (deeper && typeof deeper === "object") {
      if (Array.isArray(deeper)) return deeper as T[];
      for (const key of candidateKeys) {
        const d = (deeper as any)[key];
        if (d !== undefined && d !== null) {
          return Array.isArray(d) ? (d as T[]) : (d as T);
        }
      }
    }
  }

  // fallback: return the payload (object) for caller to validate/handle
  return payload as T;
}

/**
 * Overloads: when you pass an array schema, the function returns T[].
 * When you pass an item schema, the function returns T.
 */
export function unwrapAndValidate<T>(raw: unknown, schema: ZodType<T[]>): T[];
export function unwrapAndValidate<T>(raw: unknown, schema: ZodType<T>): T;

/**
 * Implementation: returns either T or T[] depending on the schema argument.
 */
export function unwrapAndValidate<T>(
  raw: unknown,
  schema: ZodType<T> | ZodType<T[]>
): T | T[] {
  const unwrapped = unwrapResponse<T>(raw);

  if (unwrapped == null) {
    throw new Error("No payload found in API response");
  }

  // Heuristic: detect if provided schema is an array schema
  const isArraySchema = (schema as any)?._def?.typeName === "ZodArray";

  try {
    if (Array.isArray(unwrapped)) {
      // Received an array payload
      if (isArraySchema) {
        // schema is array -> parse whole array
        return (schema as ZodType<T[]>).parse(unwrapped);
      } else {
        // schema is item -> parse each item and return array of parsed items
        const itemSchema = schema as ZodType<T>;
        return (unwrapped as any[]).map((item) => itemSchema.parse(item));
      }
    } else {
      // Received a single object
      if (isArraySchema) {
        // schema expects array: parse single object as inner type and return array
        const innerType = (schema as any)._def.type;
        const validatedSingle = innerType.parse(unwrapped);
        return [validatedSingle] as unknown as T[];
      } else {
        // both object schemas: parse and return single item
        return (schema as ZodType<T>).parse(unwrapped);
      }
    }
  } catch (err) {
    if (err instanceof ZodError) {
      console.error("[unwrapAndValidate] validation failed:", err.issues);
      throw err;
    }
    throw err;
  }
}
