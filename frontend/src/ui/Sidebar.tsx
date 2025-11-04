import { NavLink } from "react-router-dom";
import styled from "styled-components";

const Aside = styled.aside`
  grid-area: sidebar;
  padding: 24px;
  border-right: 1px solid ${(p) => p.theme.color.border};
  background: #111;
`;
const Brand = styled.div`
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 24px;
  color: ${(p) => p.theme.color.brand600};
`;
const Nav = styled.nav`
  display: grid;
  gap: 8px;
  a {
    padding: 10px 12px;
    border-radius: 10px;
  }
  a.active {
    background: ${(p) => p.theme.color.panel};
  }
`;

export default function Sidebar() {
  return (
    <Aside>
      <Brand>Studio S • Manager</Brand>
      <Nav>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/stock">Stock</NavLink>
        <NavLink to="/treatments">Treatments</NavLink>
        <NavLink to="/clients">Clients</NavLink>
        <NavLink to="/appointments">Appointments</NavLink>
      </Nav>
    </Aside>
  );
}
