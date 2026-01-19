import styled from "styled-components";
import LinkButton from "./components/LinkButton";
import ActionButton from "./components/ActionButton";
import {
  Calendar,
  DollarSign,
  Mails,
  Package,
  Paintbrush,
  ShoppingCart,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

type Tab = {
  id?: string;
  to?: string;
  label: string;
  action?: boolean;
  icon?: React.ComponentType<{ size?: number }>;
};

const DEFAULT_TABS: Tab[] = [
  { id: "dashboard", to: "/", label: "Dashboard", icon: TrendingUp },
  { id: "outbox", to: "/outbox", label: "Offline Manager", icon: Mails },
  {
    id: "appointments",
    to: "/appointments",
    label: "Appointments",
    icon: Calendar,
  },
  { id: "pos", to: "/POS", label: "POS", icon: ShoppingCart },
  { id: "cashup", to: "/CashUp", label: "Cash Up", icon: DollarSign },
  { id: "stock", to: "/stock", label: "Stock", icon: Package },
  { id: "staff", to: "/staff", label: "Staff", icon: User },
  { id: "clients", to: "/clients", label: "Clients", icon: Users },
  {
    id: "treatments",
    to: "/treatments",
    label: "Treatments",
    icon: Paintbrush,
  },
];

const Aside = styled.aside`
  grid-area: sidebar;
  padding: 24px;
  border-right: 1px solid ${(p) => p.theme.color.border};
  background: ${(p) => p.theme.color.panel};
`;

/* Brand (top) */
const BrandWrap = styled.div`
  margin-bottom: 32px;
`;

const BrandTitle = styled.div`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.05em;
  /* gradient text */
  background: linear-gradient(
    135deg,
    ${(p) => p.theme.color.brand600} 0%,
    ${(p) => p.theme.color.brand400} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const BrandSubtitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${(p) => p.theme.color.mutedText};
  margin-top: 6px;
  letter-spacing: 0.1em;
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

const SidebarLink = styled(LinkButton)`
  width: 100%;
  justify-content: flex-start;
  text-align: left;
  gap: 12px;
`;

const SidebarAction = styled(ActionButton)`
  width: 100%;
  justify-content: flex-start;
  text-align: left;
  gap: 12px;
`;

type Props = {
  tabs?: Tab[];
  activeTab?: string; // optional: sometimes consumer wants to track selected tab
  onTabChange?: (id: string) => void;
};

export default function Sidebar({
  tabs = DEFAULT_TABS,
  onTabChange,
}: {
  tabs?: Tab[];
  onTabChange?: (id?: string) => void;
}) {
  return (
    <Aside>
      <BrandWrap>
        <BrandTitle>STUDIO S</BrandTitle>
        <BrandSubtitle>MANAGER</BrandSubtitle>
      </BrandWrap>

      <Nav aria-label="Main navigation">
        {tabs.map((t) =>
          t.action ? (
            <SidebarAction
              key={t.id || t.label}
              variation="secondary"
              size="medium"
              onClick={() => onTabChange?.(t.id)}
              icon={t.icon}
            >
              {t.label}
            </SidebarAction>
          ) : (
            <SidebarLink
              key={t.id || t.label}
              to={t.to as string}
              variation="secondary"
              size="medium"
              onClick={() => onTabChange?.(t.id)}
              icon={t.icon}
            >
              {t.label}
            </SidebarLink>
          )
        )}
      </Nav>
    </Aside>
  );
}
