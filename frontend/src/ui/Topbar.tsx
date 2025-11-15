import styled from "styled-components";
import Button from "./components/Button";
import { useAuth } from "../modules/auth/AuthContext";
import ThemeSwitch from "./components/ThemeSwitch.js";

const Bar = styled.header`
  grid-area: topbar;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24px;
  border-bottom: 1px solid ${(p) => p.theme.color.border};
  background: ${(p) => p.theme.color.panel};
`;
const Toggle = styled.button`
  background: transparent;
  border: 1px solid ${(p) => p.theme.color.border};
  color: ${(p) => p.theme.color.text};
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
  margin-right: 12px;
  font-size: 14px;
`;

export default function Topbar() {
  const { user, signOut } = useAuth();
  return (
    <Bar>
      <div style={{ marginRight: "auto", opacity: 0.8 }}>
        Welcome {user?.name}
      </div>
      <ThemeSwitch />
      <Button onClick={signOut}>Sign out</Button>
    </Bar>
  );
}
