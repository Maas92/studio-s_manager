import { useState, useMemo, useCallback } from "react";

interface FilterConfig<T> {
  searchFields?: (keyof T)[];
  filterField?: keyof T;
}

export function useListFilter<T>(items: T[], config: FilterConfig<T> = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState<string>("all");

  const { searchFields = [], filterField } = config;

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply category/type filter
    if (filterField && filterValue !== "all") {
      filtered = filtered.filter((item) => item[filterField] === filterValue);
    }

    // Apply search filter
    if (searchQuery.trim() && searchFields.length > 0) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          if (typeof value === "string") {
            return value.toLowerCase().includes(query);
          }
          if (Array.isArray(value)) {
            return value.some((v) =>
              typeof v === "string" ? v.toLowerCase().includes(query) : false
            );
          }
          return false;
        })
      );
    }

    return filtered;
  }, [items, searchQuery, filterValue, searchFields, filterField]);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setFilterValue("all");
  }, []);

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    filterValue,
    setFilterValue,
    resetFilters,
  };
}
