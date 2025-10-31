import { createGlobalStyle, type DefaultTheme } from "styled-components";
import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    colors: {
      bg: string;
      panel: string;
      text: string;
      brand: string;
      muted: string;
      border: string;
    };
    radii: { lg: string; md: string };
  }
}

export const theme: DefaultTheme = {
  colors: {
    bg: "#0f0f0f",
    panel: "#151515",
    text: "#f2f2f2",
    brand: "#C2A56F",
    muted: "#9ca3af",
    border: "#262626",
  },
  radii: { lg: "16px", md: "12px" },
} as const;

export const GlobalStyle = createGlobalStyle`
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body { margin: 0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: ${(
    p
  ) => p.theme.colors.bg}; color: ${(p) => p.theme.colors.text}; }
  a { color: inherit; text-decoration: none; }
`;
