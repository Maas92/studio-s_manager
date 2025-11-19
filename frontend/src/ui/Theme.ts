// src/ui/theme.ts
import { createGlobalStyle } from "styled-components";
import "styled-components";

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Palette {}
}

type Palette = {
  color: {
    grey0: string;
    grey50: string;
    grey100: string;
    grey200: string;
    grey300: string;
    grey400: string;
    grey500: string;
    grey600: string;
    grey700: string;
    grey800: string;
    grey900: string;
    brand50: string;
    brand100: string;
    brand200: string;
    brand300: string;
    brand400: string;
    brand500: string;
    brand600: string;
    brand700: string;
    brand800: string;
    brand900: string;
    red500: string;
    red600: string;
    green500: string;
    blue100: string;
    blue500: string;
    green100: string;
    green700: string;
    yellow100: string;
    yellow700: string;
    bg: string;
    panel: string;
    text: string;
    border: string;
    mutedText: string;
    focus: string;
  };
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  radii: { sm: string; md: string; lg: string; round: string };
};

export const lightTheme: Palette = {
  color: {
    // Greys (light)
    grey0: "#ffffff",
    grey50: "#f9fafb",
    grey100: "#f3f4f6",
    grey200: "#e5e7eb",
    grey300: "#d1d5db",
    grey400: "#9ca3af",
    grey500: "#6b7280",
    grey600: "#4b5563",
    grey700: "#374151",
    grey800: "#1f2937",
    grey900: "#111827",
    // Studio S brand (gold)
    brand50: "#faf5eb",
    brand100: "#f1e5ca",
    brand200: "#e7d3a4",
    brand300: "#d9b874",
    brand400: "#cb9f4f",
    brand500: "#C2A56F",
    brand600: "#b69256",
    brand700: "#a67e3e",
    brand800: "#8f6a2f",
    brand900: "#745422",
    // Semantics
    red500: "#ef4444",
    red600: "#dc2626",
    green500: "#22c55e",
    blue100: "#dbeafe",
    blue500: "#3b82f6",
    green100: "#dcfce7",
    green700: "#15803d",
    yellow100: "#fef9c3",
    yellow700: "#a16207",
    // Surfaces
    bg: "#f9fafb",
    panel: "#ffffff",
    text: "#111827",
    border: "#e5e7eb",
    mutedText: "#6b7280",
    focus: "#f1e5ca",
  },
  shadowSm: "0 1px 2px rgba(0,0,0,0.05)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.08)",
  shadowLg: "0 10px 15px rgba(0,0,0,0.1)",
  radii: { sm: "8px", md: "12px", lg: "16px", round: "9999px" },
};

export const darkTheme: Palette = {
  color: {
    // Greys (dark tuned)
    grey0: "#0b0b0c",
    grey50: "#111214",
    grey100: "#141518",
    grey200: "#1a1c20",
    grey300: "#23262b",
    grey400: "#3a3f46",
    grey500: "#565d66",
    grey600: "#79808a",
    grey700: "#a0a6af",
    grey800: "#c7cbd1",
    grey900: "#eef0f2",
    // Brand (gold) adapted for dark—keep same hexes but contrast with dark surfaces
    brand50: "#2b2518",
    brand100: "#3a301d",
    brand200: "#5a4a29",
    brand300: "#7a6436",
    brand400: "#9a7e42",
    brand500: "#C2A56F",
    brand600: "#d1b780",
    brand700: "#dec695",
    brand800: "#ead7b1",
    brand900: "#f4ead2",
    // Semantics
    red500: "#ef4444",
    red600: "#dc2626",
    green500: "#34d399",
    blue100: "#dbeafe",
    blue500: "#60a5fa",
    green100: "#166534", // adapted dark variants if needed
    green700: "#dcfce7",
    yellow100: "#854d0e",
    yellow700: "#fef9c3",
    // Surfaces
    bg: "#0f1113",
    panel: "#15181c",
    text: "#eef0f2",
    border: "#23262b",
    mutedText: "#a0a6af",
    focus: "#3a301d",
  },
  shadowSm: "0 1px 2px rgba(0,0,0,0.35)",
  shadowMd: "0 4px 10px rgba(0,0,0,0.45)",
  shadowLg: "0 18px 30px rgba(0,0,0,0.55)",
  radii: { sm: "8px", md: "12px", lg: "16px", round: "9999px" },
};

// Default export keeps backward compatibility (light first)
export const theme = lightTheme;

export const GlobalStyle = createGlobalStyle`
  :root { color-scheme: light dark; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }

  body {
    margin: 0;
    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial, sans-serif;
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; text-decoration: none; }
  button, input, select, textarea { font: inherit; }
  ::selection { background: ${({ theme }) => theme.color.brand100}; color: ${({
  theme,
}) => theme.color.text}; }
`;
