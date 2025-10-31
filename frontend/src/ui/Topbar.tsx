import styled from "styled-components";
import { useAuth } from "../modules/auth/AuthContext";

const Bar = styled.header`
  grid-area: topbar;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;
const Button = styled.button`
  background: transparent;
  border: 1px solid ${(p) => p.theme.colors.border};
  color: inherit;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
`;

export default function Topbar() {
  const { user, signOut } = useAuth();
  return (
    <Bar>
      <div style={{ marginRight: "auto", opacity: 0.8 }}>
        Welcome {user?.name}
      </div>
      <Button onClick={signOut}>Sign out</Button>
    </Bar>
  );
}
