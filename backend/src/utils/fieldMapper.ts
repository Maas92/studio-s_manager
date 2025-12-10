/**
 * Converts snake_case database fields to camelCase for frontend
 */
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item));
  }

  if (typeof obj === "object" && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }

  return obj;
}

/**
 * Converts camelCase frontend fields to snake_case for database
 */
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => toSnakeCase(item));
  }

  if (typeof obj === "object" && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`
      );
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }

  return obj;
}
