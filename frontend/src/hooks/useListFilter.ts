import { useState, useMemo, useCallback } from "react";

interface FilterConfig<T> {
  searchFields?: (keyof T)[];
  filterField?: keyof T;
  searchQuery?: string;
}

export function useListFilter<T>(items: T[], config: FilterConfig<T> = {}) {
  const { searchFields = [], filterField, searchQuery = "" } = config;

  const [filterValue, setFilterValue] = useState<string>("all");

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (filterField && filterValue !== "all") {
      filtered = filtered.filter((item) => item[filterField] === filterValue);
    }

    if (searchQuery.trim() && searchFields.length > 0) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return (
            typeof value === "string" && value.toLowerCase().includes(query)
          );
        }),
      );
    }

    return filtered;
  }, [items, searchQuery, filterValue, searchFields, filterField]);

  const resetFilters = useCallback(() => {
    setFilterValue("all");
  }, []);

  return {
    filteredItems,
    filterValue,
    setFilterValue,
    resetFilters,
  };
}
