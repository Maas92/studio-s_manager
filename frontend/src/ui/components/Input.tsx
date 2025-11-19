import styled from "styled-components";
import React, { forwardRef, useRef, useEffect } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  fullWidth?: boolean;
}

const InputWrapper = styled.div<{ $fullWidth?: boolean }>`
  position: relative;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
  display: inline-block;
`;

const StyledInput = styled.input<{ $hasError?: boolean; $fullWidth?: boolean }>`
  width: 100%;
  height: 46px; /* match the Select height used elsewhere */
  border: 1px solid
    ${({ theme, $hasError }) =>
      $hasError ? theme.color.red500 || "#ef4444" : theme.color.border};
  background-color: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 0.8rem 1.2rem;
  box-shadow: ${({ theme }) => theme.shadowSm};
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  transition: box-shadow 0.12s ease, border-color 0.12s ease,
    background-color 0.12s ease;
  box-sizing: border-box;

  &:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.brand100};
    border-color: ${({ theme }) => theme.color.brand600};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.color.grey100 || "#f3f4f6"};
  }

  &::placeholder {
    color: ${({ theme }) => theme.color.mutedText};
    opacity: 0.7;
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.color.grey400 || "#9ca3af"};
  }

  /* Date input specific styles */
  &[type="date"] {
    cursor: pointer;
    /* ensure the browser calendar icon is visible in dark mode */
    color-scheme: light dark;
  }

  /* Force the calendar icon to remain visible (webkit browsers) */
  /* We invert it so it is visible on dark backgrounds; harmless on light */
  &[type="date"]::-webkit-calendar-picker-indicator {
    opacity: 1;
    cursor: pointer;
    -webkit-appearance: none;
    filter: invert(1) brightness(1.05);
    width: auto;
    height: auto;
  }
`;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, fullWidth = true, type, ...props }, forwardedRef) => {
    // Local ref so we can call focus/showPicker reliably.
    const localRef = useRef<HTMLInputElement | null>(null);

    // Mirror the localRef into forwardedRef so parent refs still work.
    useEffect(() => {
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") {
        forwardedRef(localRef.current);
      } else {
        try {
          (
            forwardedRef as React.MutableRefObject<HTMLInputElement | null>
          ).current = localRef.current;
        } catch {
          // ignore
        }
      }
    }, [forwardedRef]);

    // If it's a date input we wrap it to allow clicking anywhere on the wrapper
    // to open the native date picker.
    const handleWrapperClick = () => {
      const el = localRef.current;
      if (!el) return;
      // Prefer showPicker() if available (newer browsers).
      // Fallback to focus() which will also show the picker on many browsers.
      try {
        const anyEl = el;
        if (typeof anyEl.showPicker === "function") {
          anyEl.showPicker();
          return;
        }
      } catch {
        /* ignore */
      }
      el.focus();
    };

    if (type === "date") {
      return (
        <InputWrapper $fullWidth={fullWidth} onClick={handleWrapperClick}>
          <StyledInput
            ref={localRef}
            type="date"
            $hasError={hasError}
            $fullWidth={fullWidth}
            {...props}
          />
        </InputWrapper>
      );
    }

    return (
      <StyledInput
        ref={localRef}
        type={type}
        $hasError={hasError}
        $fullWidth={fullWidth}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
