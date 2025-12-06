// src/services/treatmentsApi.ts
import api from "../../services/api";
import { unwrapResponse, unwrapAndValidate } from "../../utils/unwrapResponse"; // adjust path if needed
import { toArray } from "../../services/normalise";
import { mockTreatments } from "./mockTreatments";
import { z } from "zod";
import {
  TreatmentSchema,
  CreateTreatmentSchema,
  type Treatment,
  type CreateTreatmentInput,
} from "./TreatmentSchema"; // adjust path to your existing schema file

const USE_MOCK_DATA = false;

/**
 * listTreatments: returns a flat, validated Treatment[].
 */
export async function listTreatments(): Promise<Treatment[]> {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    return mockTreatments;
  }

  try {
    const raw = await api.get("/treatments");

    // Using overload: since we pass TreatmentSchema.array(), TS knows this returns Treatment[]
    try {
      const validatedArr = unwrapAndValidate(raw, TreatmentSchema.array());
      // validatedArr is typed as Treatment[]
      return validatedArr;
    } catch (zErr) {
      // Fallback parsing in case of envelope differences
      console.warn(
        "[listTreatments] array validation failed, falling back:",
        zErr
      );
      const unwrapped = unwrapResponse<Treatment>(raw);
      const arr = Array.isArray(unwrapped)
        ? unwrapped
        : toArray<Treatment>(unwrapped);
      return arr.map((t) => TreatmentSchema.parse(t));
    }
  } catch (error) {
    console.error("[listTreatments] Failed to fetch treatments:", error);
    throw new Error("Unable to load treatments. Please try again.");
  }
}

/**
 * getTreatment: returns a single validated Treatment.
 */
export async function getTreatment(id: string): Promise<Treatment> {
  try {
    const raw = await api.get(`/treatments/${id}`);

    // Because we pass a single-item schema, unwrapAndValidate returns a Treatment
    try {
      const validated = unwrapAndValidate(raw, TreatmentSchema);
      // validated typed as Treatment
      return validated;
    } catch (zErr) {
      console.warn(
        "[getTreatment] single validation failed, falling back:",
        zErr
      );
      const unwrapped = unwrapResponse<Treatment>(raw);
      const item = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped;
      return TreatmentSchema.parse(item);
    }
  } catch (error) {
    console.error(`[getTreatment ${id}] Failed to fetch treatment:`, error);
    throw new Error("Unable to load treatment details. Please try again.");
  }
}

/**
 * createTreatment: validates input, POSTs, and returns the created Treatment
 */
export async function createTreatment(
  input: CreateTreatmentInput
): Promise<Treatment> {
  try {
    const validatedInput = CreateTreatmentSchema.parse(input);
    const raw = await api.post("/treatments", validatedInput);

    try {
      const validated = unwrapAndValidate(raw, TreatmentSchema);
      return validated;
    } catch (zErr) {
      console.warn(
        "[createTreatment] response validation failed, falling back:",
        zErr
      );
      const unwrapped = unwrapResponse<Treatment>(raw);
      const item = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped;
      return TreatmentSchema.parse(item);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("[createTreatment] Failed to create treatment:", error);
    throw new Error("Unable to create treatment. Please try again.");
  }
}

/**
 * updateTreatment: PATCH and return updated Treatment
 */
export async function updateTreatment(
  id: string,
  updates: Partial<CreateTreatmentInput>
): Promise<Treatment> {
  try {
    const raw = await api.patch(`/treatments/${id}`, updates);

    try {
      const validated = unwrapAndValidate(raw, TreatmentSchema);
      return validated;
    } catch (zErr) {
      console.warn(
        "[updateTreatment] response validation failed, falling back:",
        zErr
      );
      const unwrapped = unwrapResponse<Treatment>(raw);
      const item = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped;
      return TreatmentSchema.parse(item);
    }
  } catch (error) {
    console.error(`[updateTreatment ${id}] Failed to update:`, error);
    throw new Error("Unable to update treatment. Please try again.");
  }
}

/**
 * deleteTreatment
 */
export async function deleteTreatment(id: string): Promise<void> {
  try {
    await api.delete(`/treatments/${id}`);
  } catch (error) {
    console.error(`[deleteTreatment ${id}] Failed to delete:`, error);
    throw new Error("Unable to delete treatment. Please try again.");
  }
}
