import { Outlet } from "react-router-dom";
import styled from "styled-components";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const Shell = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 64px 1fr;
  grid-template-areas: "sidebar topbar" "sidebar main";
  height: 100dvh;
`;
const Main = styled.main`
  grid-area: main;
  padding: 24px;
  border-left: 1px solid ${(p) => p.theme.color.border};
`;

export default function AppLayout() {
  return (
    <Shell>
      <Sidebar />
      <Topbar />
      <Main>
        <Outlet />
      </Main>
    </Shell>
  );
}
