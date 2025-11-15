import styled from "styled-components";
import { useTheme } from "../../contexts/ThemeContext.js";

const Label = styled.label`
  --w: 52px;
  --h: 30px;
  --k: 22px;

  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
`;

const HiddenCheckbox = styled.input.attrs({ type: "checkbox" })`
  position: absolute !important;
  opacity: 0;
  pointer-events: none;
`;

const Track = styled.span<{ $checked: boolean }>`
  width: var(--w);
  height: var(--h);
  border-radius: calc(var(--h) / 2);
  display: inline-block;
  padding: 3px;
  box-sizing: border-box;
  border: 1px solid ${(p) => p.theme.color.border};
  background: ${(p) =>
    p.$checked ? p.theme.color.grey500 : p.theme.color.border};
  position: relative;
  transition: background-color 200ms ease, box-shadow 200ms ease;
`;

const Knob = styled.span<{ $checked: boolean }>`
  width: var(--k);
  height: var(--k);
  border-radius: 50%;
  background: ${(p) => p.theme.color.panel};
  display: grid;
  place-items: center;
  position: absolute;
  top: 3px;
  left: 3px;
  transform: translateX(${(p) => (p.$checked ? "22px" : "0")});
  transition: transform 200ms cubic-bezier(0.3, 0.8, 0.3, 1),
    box-shadow 200ms ease;
  box-shadow: ${(p) =>
    p.$checked
      ? "0 6px 18px rgba(212, 184, 106, 0.18)" // dark mode glow
      : "0 1px 3px rgba(0,0,0,0.08)"};
`;

const LabelText = styled.span`
  font-size: 14px;
  color: ${(p) => p.theme.color.text};
  opacity: 0.9;
  padding-left: 4px;
  padding-right: 20px;
`;

const IconShell = styled.span`
  width: 14px;
  height: 14px;
  pointer-events: none;
  height: var(--k);
`;

function SunIcon() {
  return (
    <IconShell aria-hidden>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.5 3.5M20.5 20.5 19 19M19 5l1.5-1.5M4 20l1.5-1.5" />
      </svg>
    </IconShell>
  );
}

function MoonIcon() {
  return (
    <IconShell aria-hidden>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
      </svg>
    </IconShell>
  );
}

export default function ThemeSwitch() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Label title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      <HiddenCheckbox checked={isDark} onChange={toggleTheme} />

      <Track $checked={isDark}>
        <Knob $checked={isDark}>{isDark ? <MoonIcon /> : <SunIcon />}</Knob>
      </Track>

      <LabelText>{isDark ? "Dark" : "Light"}</LabelText>
    </Label>
  );
}
