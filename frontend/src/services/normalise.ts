export function toArray<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  return [];
}
