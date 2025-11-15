import React, { useState, useEffect, createContext, useContext } from "react";
import {
  Calendar,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Settings,
  Moon,
  Sun,
  Search,
  Plus,
  X,
  Check,
  Clock,
  DollarSign,
  Box,
  MapPin,
  Filter,
  ChevronDown,
} from "lucide-react";

// ============================================================================
// THEME & STYLED COMPONENTS SYSTEM
// ============================================================================

const lightTheme = {
  color: {
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
    red500: "#ef4444",
    red600: "#dc2626",
    green500: "#22c55e",
    blue500: "#3b82f6",
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

const darkTheme = {
  color: {
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
    red500: "#ef4444",
    red600: "#dc2626",
    green500: "#34d399",
    blue500: "#60a5fa",
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

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext();
const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

const AuthContext = createContext();
const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ============================================================================
// MOCK API LAYER (simulating your services/api.ts pattern)
// ============================================================================

const mockApi = {
  appointments: [
    {
      id: "1",
      clientId: "c1",
      clientName: "Sarah Johnson",
      treatmentId: "t1",
      treatmentName: "Facial Treatment",
      datetimeISO: new Date(Date.now() + 3600000).toISOString(),
      status: "confirmed",
      staffName: "Emma Wilson",
      loyaltyPoints: 450,
    },
    {
      id: "2",
      clientId: "c2",
      clientName: "Mike Brown",
      treatmentId: "t2",
      treatmentName: "Haircut",
      datetimeISO: new Date(Date.now() + 7200000).toISOString(),
      status: "pending",
      staffName: "David Chen",
      loyaltyPoints: 230,
    },
    {
      id: "3",
      clientId: "c3",
      clientName: "Lisa Chen",
      treatmentId: "t3",
      treatmentName: "Manicure",
      datetimeISO: new Date(Date.now() + 14400000).toISOString(),
      status: "confirmed",
      staffName: "Sophie Martinez",
      loyaltyPoints: 680,
    },
  ],
  products: [
    {
      id: "p1",
      sku: "MOIST-001",
      name: "Moisturizer",
      price: 35,
      retail: true,
      category: "retail",
      stock: 15,
    },
    {
      id: "p2",
      sku: "SERUM-001",
      name: "Face Serum",
      price: 48,
      retail: true,
      category: "retail",
      stock: 8,
    },
    {
      id: "p3",
      sku: "HAIR-001",
      name: "Hair Treatment",
      price: 42,
      retail: true,
      category: "retail",
      stock: 12,
    },
  ],
  treatments: [
    { id: "t1", name: "Facial Treatment", durationMinutes: 60, price: 85 },
    { id: "t2", name: "Haircut & Style", durationMinutes: 45, price: 65 },
    { id: "t3", name: "Manicure", durationMinutes: 30, price: 45 },
    { id: "t4", name: "Pedicure", durationMinutes: 40, price: 55 },
  ],
  stock: [
    {
      id: "s1",
      productId: "p1",
      productName: "Moisturizer",
      location: "storage",
      qty: 45,
      minStock: 20,
    },
    {
      id: "s2",
      productId: "p1",
      productName: "Moisturizer",
      location: "treatment",
      qty: 8,
      minStock: 20,
    },
    {
      id: "s3",
      productId: "p1",
      productName: "Moisturizer",
      location: "retail",
      qty: 15,
      minStock: 20,
    },
    {
      id: "s4",
      productId: "p2",
      productName: "Face Serum",
      location: "storage",
      qty: 22,
      minStock: 15,
    },
    {
      id: "s5",
      productId: "p2",
      productName: "Face Serum",
      location: "treatment",
      qty: 5,
      minStock: 15,
    },
    {
      id: "s6",
      productId: "p2",
      productName: "Face Serum",
      location: "retail",
      qty: 8,
      minStock: 15,
    },
  ],
  staff: [
    {
      id: "st1",
      name: "Emma Wilson",
      role: "Senior Aesthetician",
      schedule: "Mon-Fri",
      phone: "555-0101",
      email: "emma@studio.com",
    },
    {
      id: "st2",
      name: "David Chen",
      role: "Hair Stylist",
      schedule: "Tue-Sat",
      phone: "555-0102",
      email: "david@studio.com",
    },
    {
      id: "st3",
      name: "Sophie Martinez",
      role: "Nail Technician",
      schedule: "Mon-Fri",
      phone: "555-0103",
      email: "sophie@studio.com",
    },
  ],
  clients: [
    {
      id: "c1",
      name: "Sarah Johnson",
      phone: "555-1001",
      email: "sarah@example.com",
      loyaltyPoints: 450,
    },
    {
      id: "c2",
      name: "Mike Brown",
      phone: "555-1002",
      email: "mike@example.com",
      loyaltyPoints: 230,
    },
    {
      id: "c3",
      name: "Lisa Chen",
      phone: "555-1003",
      email: "lisa@example.com",
      loyaltyPoints: 680,
    },
  ],
};

// Simulated API functions
const api = {
  listAppointments: async () => mockApi.appointments,
  listProducts: async () => mockApi.products,
  listTreatments: async () => mockApi.treatments,
  listStock: async () => mockApi.stock,
  listStaff: async () => mockApi.staff,
  listClients: async () => mockApi.clients,
  getDashboardSummary: async () => ({
    revenueToday: 2450,
    appointmentsToday: 24,
    activeClients: 156,
    stockValue: 8920,
  }),
};

// ============================================================================
// UI COMPONENTS (matching your component patterns)
// ============================================================================

const Card = ({ children, className = "", style = {} }) => {
  const { theme } = useTheme();
  return (
    <div
      className={className}
      style={{
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radii.lg,
        padding: "20px",
        boxShadow: theme.shadowMd,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Button = ({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "medium",
  className = "",
  icon = null,
}) => {
  const { theme } = useTheme();

  const variants = {
    primary: {
      background: theme.color.brand600,
      color: "#ffffff",
      border: `1px solid ${theme.color.brand600}`,
      hoverBg: theme.color.brand700,
    },
    secondary: {
      background: theme.color.grey100,
      color: theme.color.text,
      border: `1px solid ${theme.color.border}`,
      hoverBg: theme.color.grey200,
    },
    danger: {
      background: theme.color.red600,
      color: "#ffffff",
      border: `1px solid ${theme.color.red600}`,
      hoverBg: theme.color.red500,
    },
  };

  const sizes = {
    small: { padding: "6px 12px", fontSize: "13px" },
    medium: { padding: "10px 16px", fontSize: "14px" },
    large: { padding: "12px 20px", fontSize: "16px" },
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: variantStyle.background,
        color: variantStyle.color,
        border: variantStyle.border,
        borderRadius: theme.radii.md,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s",
        boxShadow: theme.shadowSm,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = variantStyle.hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          e.currentTarget.style.background = variantStyle.background;
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const Input = ({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  style = {},
}) => {
  const { theme } = useTheme();
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      style={{
        width: "100%",
        padding: "10px 14px",
        background: theme.color.grey0,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radii.md,
        color: theme.color.text,
        fontSize: "14px",
        outline: "none",
        transition: "border 0.2s",
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.border = `2px solid ${theme.color.brand500}`;
      }}
      onBlur={(e) => {
        e.target.style.border = `1px solid ${theme.color.border}`;
      }}
    />
  );
};

const Select = ({ value, onChange, options, className = "" }) => {
  const { theme } = useTheme();
  return (
    <select
      value={value}
      onChange={onChange}
      className={className}
      style={{
        padding: "10px 14px",
        background: theme.color.grey0,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radii.md,
        color: theme.color.text,
        fontSize: "14px",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

const Table = ({ columns, data, onRowClick }) => {
  const { theme } = useTheme();
  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: theme.radii.md,
        border: `1px solid ${theme.color.border}`,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: theme.color.grey100 }}>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: "14px 16px",
                  textAlign: "left",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: theme.color.grey700,
                  borderBottom: `1px solid ${theme.color.border}`,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                cursor: onRowClick ? "pointer" : "default",
                borderBottom:
                  rowIdx !== data.length - 1
                    ? `1px solid ${theme.color.border}`
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (onRowClick)
                  e.currentTarget.style.background = theme.color.grey50;
              }}
              onMouseLeave={(e) => {
                if (onRowClick)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  style={{
                    padding: "14px 16px",
                    fontSize: "14px",
                    color: theme.color.text,
                  }}
                >
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Badge = ({ children, variant = "default" }) => {
  const { theme } = useTheme();
  const variants = {
    default: { bg: theme.color.grey200, color: theme.color.grey800 },
    success: { bg: theme.color.green500 + "20", color: theme.color.green500 },
    warning: { bg: theme.color.brand200, color: theme.color.brand800 },
    danger: { bg: theme.color.red500 + "20", color: theme.color.red500 },
  };
  const style = variants[variant];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        background: style.bg,
        color: style.color,
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  const { theme } = useTheme();
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.color.panel,
          borderRadius: theme.radii.lg,
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: theme.shadowLg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: `1px solid ${theme.color.border}`,
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: theme.color.text,
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
            }}
          >
            <X size={20} color={theme.color.grey500} />
          </button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
};

const Heading = ({ level = "h2", children, style = {} }) => {
  const { theme } = useTheme();
  const sizes = { h1: "28px", h2: "22px", h3: "18px", h4: "16px" };
  const Tag = level;
  return (
    <Tag
      style={{
        fontSize: sizes[level],
        fontWeight: 800,
        color: theme.color.grey900,
        marginBottom: "16px",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
};

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

const AppLayout = ({ children }) => {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gridTemplateRows: "64px 1fr",
        gridTemplateAreas: '"sidebar topbar" "sidebar main"',
        height: "100vh",
        background: theme.color.bg,
        color: theme.color.text,
      }}
    >
      {children}
    </div>
  );
};

const Sidebar = ({ activeTab, onTabChange }) => {
  const { theme } = useTheme();

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "pos", label: "POS", icon: ShoppingCart },
    { id: "stock", label: "Stock", icon: Package },
    { id: "staff", label: "Staff", icon: Users },
    { id: "clients", label: "Clients", icon: Users },
  ];

  return (
    <aside
      style={{
        gridArea: "sidebar",
        padding: "24px",
        background: theme.color.panel,
        borderRight: `1px solid ${theme.color.border}`,
      }}
    >
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            fontSize: "20px",
            fontWeight: 800,
            background: `linear-gradient(135deg, ${theme.color.brand600} 0%, ${theme.color.brand400} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.05em",
          }}
        >
          STUDIO S
        </div>
        <div
          style={{
            fontSize: "11px",
            color: theme.color.mutedText,
            marginTop: "4px",
            letterSpacing: "0.1em",
          }}
        >
          MANAGER
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                background: isActive ? theme.color.brand600 : "transparent",
                color: isActive ? "#ffffff" : theme.color.text,
                border: "none",
                borderRadius: theme.radii.md,
                fontSize: "14px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = theme.color.grey100;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

const Topbar = ({ onToggleTheme }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  return (
    <header
      style={{
        gridArea: "topbar",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: `1px solid ${theme.color.border}`,
        background: theme.color.panel,
      }}
    >
      <div style={{ fontSize: "14px", color: theme.color.mutedText }}>
        Welcome back,{" "}
        <strong style={{ color: theme.color.text }}>{user?.name}</strong>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onToggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            background: theme.color.grey100,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.radii.md,
            color: theme.color.text,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
};

// ============================================================================
// FEATURE MODULES
// ============================================================================

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardSummary().then((data) => {
      setSummary(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  const stats = [
    {
      label: "Revenue Today",
      value: `$${summary.revenueToday.toLocaleString()}`,
      icon: DollarSign,
      change: "+12%",
      positive: true,
    },
    {
      label: "Appointments",
      value: summary.appointmentsToday,
      icon: Calendar,
      change: "+8%",
      positive: true,
    },
    {
      label: "Active Clients",
      value: summary.activeClients,
      icon: Users,
      change: "+5%",
      positive: true,
    },
    {
      label: "Stock Value",
      value: `$${summary.stockValue.toLocaleString()}`,
      icon: Package,
      change: "-3%",
      positive: false,
    },
  ];

  return (
    <div>
      <Heading level="h1">Dashboard</Heading>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <stat.icon
                size={24}
                style={{ color: stat.positive ? "#22c55e" : "#ef4444" }}
              />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: stat.positive ? "#22c55e" : "#ef4444",
                }}
              >
                {stat.change}
              </span>
            </div>
            <div
              style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
              {stat.label}
            </div>
          </Card>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <Card>
          <Heading level="h3">Top Services</Heading>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {[
              { name: "Facial Treatment", revenue: "$850", bookings: 12 },
              { name: "Haircut & Style", revenue: "$720", bookings: 15 },
              { name: "Manicure", revenue: "$540", bookings: 18 },
            ].map((service, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    {service.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {service.bookings} bookings
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#C2A56F",
                  }}
                >
                  {service.revenue}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Heading level="h3">Top Clients</Heading>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {mockApi.clients.slice(0, 3).map((client, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    {client.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {client.loyaltyPoints} points
                  </div>
                </div>
                <Badge variant="success">{client.loyaltyPoints}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.listAppointments().then((data) => {
      setAppointments(data);
      setLoading(false);
    });
  }, []);

  const columns = [
    {
      header: "Date & Time",
      accessor: "datetimeISO",
      render: (row) => new Date(row.datetimeISO).toLocaleString(),
    },
    { header: "Client", accessor: "clientName" },
    { header: "Treatment", accessor: "treatmentName" },
    { header: "Staff", accessor: "staffName" },
    {
      header: "Loyalty",
      accessor: "loyaltyPoints",
      render: (row) => `${row.loyaltyPoints} pts`,
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => (
        <Badge variant={row.status === "confirmed" ? "success" : "warning"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  if (loading) return <div>Loading appointments...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <Heading level="h1">Appointments</Heading>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          New Appointment
        </Button>
      </div>

      <Card>
        <Table columns={columns} data={appointments} />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Appointment"
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Client
            </label>
            <Select
              options={mockApi.clients.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Treatment
            </label>
            <Select
              options={mockApi.treatments.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.durationMinutes}min)`,
              }))}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Staff
            </label>
            <Select
              options={mockApi.staff.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Date & Time
            </label>
            <Input type="datetime-local" />
          </div>
          <Button onClick={() => setShowModal(false)}>Book Appointment</Button>
        </div>
      </Modal>
    </div>
  );
};

const POSView = () => {
  const [cart, setCart] = useState([]);
  const [clientType, setClientType] = useState("walk-in");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const allItems = [...mockApi.treatments, ...mockApi.products].filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (item) => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      setCart(
        cart.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
      );
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const updateQty = (id, delta) => {
    setCart(
      cart
        .map((i) => {
          if (i.id === id) {
            const newQty = i.qty + delta;
            return newQty > 0 ? { ...i, qty: newQty } : i;
          }
          return i;
        })
        .filter((i) => i.qty > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const loyaltyPoints = Math.floor(total * 10);

  return (
    <div>
      <Heading level="h1">Point of Sale</Heading>

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}
      >
        {/* Items Section */}
        <div>
          <Card style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              {["walk-in", "booked", "retail"].map((type) => (
                <Button
                  key={type}
                  variant={clientType === type ? "primary" : "secondary"}
                  onClick={() => setClientType(type)}
                  size="small"
                >
                  {type === "walk-in"
                    ? "Walk-in"
                    : type === "booked"
                    ? "Pre-booked"
                    : "Retail Only"}
                </Button>
              ))}
            </div>

            {clientType === "booked" && (
              <Select
                options={[
                  { value: "", label: "Select client..." },
                  ...mockApi.clients.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.loyaltyPoints} pts)`,
                  })),
                ]}
                onChange={(e) =>
                  setSelectedClient(
                    mockApi.clients.find((c) => c.id === e.target.value)
                  )
                }
              />
            )}
          </Card>

          <Card>
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <Search
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
                size={18}
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services or products..."
                style={{ paddingLeft: "40px" }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              {allItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  style={{
                    padding: "16px",
                    background: "transparent",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C2A56F";
                    e.currentTarget.style.background = "#faf5eb10";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      marginBottom: "4px",
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#C2A56F",
                    }}
                  >
                    ${item.price}
                  </div>
                  {item.durationMinutes && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "4px",
                      }}
                    >
                      {item.durationMinutes} min
                    </div>
                  )}
                  {item.stock !== undefined && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "4px",
                      }}
                    >
                      Stock: {item.stock}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Cart Section */}
        <div>
          <Card>
            <Heading level="h3">Cart</Heading>

            {cart.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#9ca3af",
                }}
              >
                <ShoppingCart
                  size={48}
                  style={{ margin: "0 auto 12px", opacity: 0.3 }}
                />
                <div>Cart is empty</div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginBottom: "20px",
                    maxHeight: "400px",
                    overflowY: "auto",
                  }}
                >
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "12px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "14px" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          ${item.price} × {item.qty}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          style={{
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f3f4f6",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{
                            fontWeight: 700,
                            minWidth: "60px",
                            textAlign: "right",
                          }}
                        >
                          ${(item.price * item.qty).toFixed(2)}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          style={{
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f3f4f6",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                          }}
                        >
                          <X size={16} color="#ef4444" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderTop: "2px solid #e5e7eb",
                    paddingTop: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "18px",
                      fontWeight: 700,
                      marginBottom: "8px",
                    }}
                  >
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color: "#C2A56F",
                    }}
                  >
                    <span>Loyalty Points:</span>
                    <span>+{loyaltyPoints} pts</span>
                  </div>
                </div>

                <Button onClick={() => setCart([])} style={{ width: "100%" }}>
                  Process Payment
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const StockView = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    api.listStock().then((data) => {
      setStock(data);
      setLoading(false);
    });
  }, []);

  const groupedStock = stock.reduce((acc, item) => {
    if (!acc[item.productName]) {
      acc[item.productName] = {
        productName: item.productName,
        locations: {},
        total: 0,
        minStock: item.minStock,
      };
    }
    acc[item.productName].locations[item.location] = item.qty;
    acc[item.productName].total += item.qty;
    return acc;
  }, {});

  const stockData = Object.values(groupedStock).filter((item) => {
    if (selectedLocation === "all") return true;
    return item.locations[selectedLocation] !== undefined;
  });

  if (loading) return <div>Loading stock...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <Heading level="h1">Stock Management</Heading>
        <div style={{ display: "flex", gap: "12px" }}>
          <Select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            options={[
              { value: "all", label: "All Locations" },
              { value: "storage", label: "Storage" },
              { value: "treatment", label: "Treatment Rooms" },
              { value: "retail", label: "Retail Floor" },
            ]}
          />
          <Button icon={<Plus size={18} />}>Add Product</Button>
        </div>
      </div>

      <Card>
        <Table
          columns={[
            { header: "Product", accessor: "productName" },
            {
              header: "Storage",
              accessor: "storage",
              render: (row) => row.locations.storage || 0,
            },
            {
              header: "Treatment",
              accessor: "treatment",
              render: (row) => row.locations.treatment || 0,
            },
            {
              header: "Retail",
              accessor: "retail",
              render: (row) => row.locations.retail || 0,
            },
            {
              header: "Total",
              accessor: "total",
              render: (row) => <strong>{row.total}</strong>,
            },
            {
              header: "Status",
              accessor: "status",
              render: (row) => (
                <Badge
                  variant={row.total < row.minStock ? "danger" : "success"}
                >
                  {row.total < row.minStock ? "Low Stock" : "In Stock"}
                </Badge>
              ),
            },
            {
              header: "Actions",
              accessor: "actions",
              render: () => (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setShowTransferModal(true)}
                >
                  Transfer
                </Button>
              ),
            },
          ]}
          data={stockData}
        />
      </Card>

      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Stock"
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Product
            </label>
            <Select
              options={stockData.map((s) => ({
                value: s.productName,
                label: s.productName,
              }))}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              From Location
            </label>
            <Select
              options={[
                { value: "storage", label: "Storage" },
                { value: "treatment", label: "Treatment Room" },
                { value: "retail", label: "Retail Floor" },
              ]}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              To Location
            </label>
            <Select
              options={[
                { value: "storage", label: "Storage" },
                { value: "treatment", label: "Treatment Room" },
                { value: "retail", label: "Retail Floor" },
              ]}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Quantity
            </label>
            <Input type="number" placeholder="0" />
          </div>
          <Button onClick={() => setShowTransferModal(false)}>
            Transfer Stock
          </Button>
        </div>
      </Modal>
    </div>
  );
};

const StaffView = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.listStaff().then((data) => {
      setStaff(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading staff...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <Heading level="h1">Staff Management</Heading>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Add Staff
        </Button>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        {staff.map((member) => (
          <Card key={member.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
              }}
            >
              <div>
                <Heading level="h3" style={{ marginBottom: "8px" }}>
                  {member.name}
                </Heading>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#C2A56F",
                    fontWeight: 600,
                    marginBottom: "12px",
                  }}
                >
                  {member.role}
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: "4px",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  <div>📅 Schedule: {member.schedule}</div>
                  <div>📞 {member.phone}</div>
                  <div>✉️ {member.email}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button size="small" variant="primary">
                  Edit
                </Button>
                <Button size="small" variant="secondary">
                  Schedule
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Staff Member"
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Name
            </label>
            <Input placeholder="Full name" />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Role
            </label>
            <Input placeholder="e.g., Senior Aesthetician" />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Email
            </label>
            <Input type="email" placeholder="email@example.com" />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Phone
            </label>
            <Input type="tel" placeholder="555-0000" />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Schedule
            </label>
            <Input placeholder="e.g., Mon-Fri" />
          </div>
          <Button onClick={() => setShowModal(false)}>Add Staff Member</Button>
        </div>
      </Modal>
    </div>
  );
};

const ClientsView = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api.listClients().then((data) => {
      setClients(data);
      setLoading(false);
    });
  }, []);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Loading clients...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <Heading level="h1">Clients</Heading>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Add Client
        </Button>
      </div>

      <Card style={{ marginBottom: "20px" }}>
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
            size={18}
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name or email..."
            style={{ paddingLeft: "40px" }}
          />
        </div>
      </Card>

      <Card>
        <Table
          columns={[
            { header: "Name", accessor: "name" },
            {
              header: "Phone",
              accessor: "phone",
              render: (row) => row.phone || "-",
            },
            {
              header: "Email",
              accessor: "email",
              render: (row) => row.email || "-",
            },
            {
              header: "Loyalty Points",
              accessor: "loyaltyPoints",
              render: (row) => (
                <Badge variant="success">{row.loyaltyPoints} pts</Badge>
              ),
            },
          ]}
          data={filteredClients}
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Client"
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Name
            </label>
            <Input placeholder="Full name" />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Phone
            </label>
            <Input type="tel" placeholder="555-0000" />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Email
            </label>
            <Input type="email" placeholder="email@example.com" />
          </div>
          <Button onClick={() => setShowModal(false)}>Add Client</Button>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user] = useState({
    id: "1",
    name: "Admin User",
    email: "admin@studiomanager.com",
    roles: ["admin"],
  });

  const theme = isDark ? darkTheme : lightTheme;

  const renderView = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "appointments":
        return <Appointments />;
      case "pos":
        return <POSView />;
      case "stock":
        return <StockView />;
      case "staff":
        return <StaffView />;
      case "clients":
        return <ClientsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setIsDark }}>
      <AuthContext.Provider value={{ user }}>
        <AppLayout>
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <Topbar onToggleTheme={() => setIsDark(!isDark)} />
          <main
            style={{ gridArea: "main", padding: "32px", overflowY: "auto" }}
          >
            {renderView()}
          </main>
        </AppLayout>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
