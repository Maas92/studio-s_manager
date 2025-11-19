import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import Input from "./Input.js";

export interface SimpleOption {
  id: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SimpleOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowFreeInput?: boolean;
  debounceMs?: number;
  id?: string;
  ariaLabel?: string;
  labelRenderer?: (option: SimpleOption) => React.ReactNode;
  disabled?: boolean;
  hasError?: boolean;
  required?: boolean;
}

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Dropdown = styled.ul<{ $visible: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  margin: 6px 0 0 0;
  padding: 6px;
  max-height: 220px;
  overflow: auto;
  list-style: none;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadowMd};
  z-index: 9999;
  display: ${({ $visible }) => ($visible ? "block" : "none")};
`;

const Option = styled.li<{ $active?: boolean }>`
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};
  background: ${({ $active, theme }) =>
    $active ? theme.color.brand50 : "transparent"};
  transition: background-color 0.1s ease;

  &:hover {
    background: ${({ theme }) => theme.color.brand50};
  }
`;

const Empty = styled.div`
  padding: 8px 10px;
  color: ${({ theme }) => theme.color.mutedText};
  font-size: 0.95rem;
`;

const SearchableSelect = React.forwardRef<
  HTMLInputElement,
  SearchableSelectProps
>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Search...",
      allowFreeInput = false,
      debounceMs = 150,
      id,
      ariaLabel,
      labelRenderer,
      disabled = false,
      hasError = false,
      required = false,
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (forwardedRef ||
      internalRef) as React.RefObject<HTMLInputElement>;
    const listRef = useRef<HTMLUListElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState<string>("");
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [filtered, setFiltered] = useState<SimpleOption[]>(options);

    // Initialize query from value
    useEffect(() => {
      const found = options.find((o) => o.id === value);
      setQuery(found ? found.label : value || "");
    }, [value, options]);

    // Debounced filtering
    useEffect(() => {
      const timer = setTimeout(() => {
        const q = query.trim().toLowerCase();
        if (!q) {
          setFiltered(options);
          setHighlightIndex(0);
          return;
        }
        const newFiltered = options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
        );
        setFiltered(newFiltered);
        setHighlightIndex(0);
      }, debounceMs);

      return () => clearTimeout(timer);
    }, [query, options, debounceMs]);

    const openDropdown = useCallback(() => {
      if (disabled) return;
      setOpen(true);
      setFiltered(options);
      setHighlightIndex(0);
    }, [disabled, options]);

    const closeDropdown = useCallback(() => {
      setOpen(false);
    }, []);

    const selectOption = useCallback(
      (opt: SimpleOption) => {
        onChange(opt.id);
        setQuery(opt.label);
        closeDropdown();
      },
      [onChange, closeDropdown]
    );

    const scrollIntoView = useCallback((index: number) => {
      const list = listRef.current;
      if (!list) return;
      const el = list.children[index] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, []);

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open && ["ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          openDropdown();
          return;
        }

        if (!open) return;

        switch (e.key) {
          case "Escape":
            e.preventDefault();
            closeDropdown();
            break;
          case "ArrowDown":
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
            scrollIntoView(Math.min(highlightIndex + 1, filtered.length - 1));
            break;
          case "ArrowUp":
            e.preventDefault();
            setHighlightIndex((i) => Math.max(0, i - 1));
            scrollIntoView(Math.max(0, highlightIndex - 1));
            break;
          case "Home":
            e.preventDefault();
            setHighlightIndex(0);
            scrollIntoView(0);
            break;
          case "End":
            e.preventDefault();
            setHighlightIndex(filtered.length - 1);
            scrollIntoView(filtered.length - 1);
            break;
          case "Enter": {
            e.preventDefault();
            const opt = filtered[highlightIndex];
            if (opt) {
              selectOption(opt);
            } else if (allowFreeInput && query.trim()) {
              onChange(query.trim());
              closeDropdown();
            }
            break;
          }
          default:
            break;
        }
      },
      [
        open,
        filtered,
        highlightIndex,
        allowFreeInput,
        query,
        openDropdown,
        closeDropdown,
        selectOption,
        onChange,
        scrollIntoView,
      ]
    );

    // Click outside handler - CRITICAL FIX: Use capture phase to intercept before Modal
    useEffect(() => {
      if (!open) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        // If clicking inside wrapper, don't close
        if (wrapperRef.current?.contains(target)) {
          return;
        }
        // Clicking outside, close the dropdown
        closeDropdown();
      };

      // IMPORTANT: Use capture phase (true) to catch event before Modal's handler
      document.addEventListener("mousedown", handleClickOutside, true);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside, true);
      };
    }, [open, closeDropdown]);

    // Memoized dropdown items
    const listItems = useMemo(() => {
      if (filtered.length === 0) {
        return (
          <Empty key="empty" role="option" aria-selected={false}>
            No results found
          </Empty>
        );
      }
      return filtered.map((opt, idx) => (
        <Option
          role="option"
          id={`${id || "search-select"}-opt-${opt.id}`}
          aria-selected={idx === highlightIndex}
          key={opt.id}
          $active={idx === highlightIndex}
          onMouseEnter={() => setHighlightIndex(idx)}
          onClick={(e) => {
            e.stopPropagation();
            selectOption(opt);
          }}
        >
          {labelRenderer ? labelRenderer(opt) : opt.label}
        </Option>
      ));
    }, [filtered, highlightIndex, id, labelRenderer, selectOption]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        if (!allowFreeInput) {
          onChange("");
        }
      },
      [allowFreeInput, onChange]
    );

    return (
      <Wrapper ref={wrapperRef}>
        <Input
          ref={inputRef}
          id={id}
          value={query}
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder}
          aria-expanded={open}
          aria-controls={`${id || "search-select"}-listbox`}
          aria-autocomplete="list"
          role="combobox"
          onFocus={openDropdown}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          autoComplete="off"
          disabled={disabled}
          hasError={hasError}
          required={required}
        />

        <Dropdown
          id={`${id || "search-select"}-listbox`}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          $visible={open}
          ref={listRef}
        >
          {listItems}
        </Dropdown>
      </Wrapper>
    );
  }
);

SearchableSelect.displayName = "SearchableSelect";

export default SearchableSelect;
