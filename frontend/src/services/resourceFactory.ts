/**
 * Generic resource CRUD client factory.
 * Produces typed functions: list, get, create, update, delete.
 *
 * Uses existing `api` axios instance and `unwrapResponse`/`unwrapAndValidate`.
 */
import { z } from "zod";
import api from "../services/api";
import { unwrapResponse, unwrapAndValidate } from "../utils/unwrapResponse";
import type { ZodType } from "zod";

type ResourceClient<T, CreateInput = Partial<T>> = {
  list(): Promise<T[]>;
  get(id: string): Promise<T>;
  create(input: CreateInput): Promise<T>;
  update(id: string, updates: Partial<CreateInput>): Promise<T>;
  delete(id: string): Promise<void>;
};

export function createResourceClient<T, CreateInput = Partial<T>>(opts: {
  basePath: string;
  schema: ZodType<T>;
  createSchema?: ZodType<CreateInput>;
}): ResourceClient<T, CreateInput> {
  const { basePath, schema, createSchema } = opts;

  async function list(): Promise<T[]> {
    const raw = await api.get(basePath);
    try {
      // FIX: Use z.array(schema) instead of schema.array()
      const validated = unwrapAndValidate(raw, z.array(schema));
      return Array.isArray(validated) ? validated : [validated];
    } catch (err) {
      console.error(
        "Validation failed in list(), falling back to manual parsing:",
        err
      );
      const unwrapped = unwrapResponse<T>(raw);
      const arr = Array.isArray(unwrapped)
        ? unwrapped
        : unwrapped
        ? [unwrapped]
        : [];
      return arr.map((it) => schema.parse(it));
    }
  }

  async function get(id: string): Promise<T> {
    const raw = await api.get(`${basePath}/${id}`);
    try {
      const validated = unwrapAndValidate(raw, schema);
      return validated as T;
    } catch (err) {
      console.error(
        "Validation failed in get(), falling back to manual parsing:",
        err
      );
      const unwrapped = unwrapResponse<T>(raw);
      const item = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped;
      return schema.parse(item);
    }
  }

  async function create(input: CreateInput): Promise<T> {
    if (createSchema) createSchema.parse(input);
    const raw = await api.post(basePath, input);
    try {
      const validated = unwrapAndValidate(raw, schema);
      return Array.isArray(validated) ? validated[0] : validated;
    } catch (err) {
      console.error(
        "Validation failed in create(), falling back to manual parsing:",
        err
      );
      const unwrapped = unwrapResponse<T>(raw);
      const item = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped;
      return schema.parse(item);
    }
  }

  async function update(id: string, updates: Partial<CreateInput>): Promise<T> {
    const raw = await api.patch(`${basePath}/${id}`, updates);
    try {
      const validated = unwrapAndValidate(raw, schema);
      return Array.isArray(validated) ? validated[0] : validated;
    } catch (err) {
      console.error(
        "Validation failed in update(), falling back to manual parsing:",
        err
      );
      const unwrapped = unwrapResponse<T>(raw);
      const item = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped;
      return schema.parse(item);
    }
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`${basePath}/${id}`);
  }

  return { list, get, create, update, delete: remove };
}
