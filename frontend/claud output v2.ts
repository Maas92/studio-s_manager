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
} from "lucide-react";

// Theme Context
const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

// Auth Context
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);

// Main App Component
export default function BeautyStudioApp() {
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState({ name: "Admin", role: "owner" });

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <AuthContext.Provider value={{ user, setUser }}>
        <div className={darkMode ? "dark" : ""}>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
            <Dashboard />
          </div>
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

// Dashboard Component
function Dashboard() {
  const [activeTab, setActiveTab] = useState("appointments");
  const { darkMode, setDarkMode } = useTheme();

  const tabs = [
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "pos", label: "POS", icon: ShoppingCart },
    { id: "stock", label: "Stock", icon: Package },
    { id: "staff", label: "Staff", icon: Users },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Beauty Studio
          </h1>
        </div>

        <nav className="px-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-purple-500 text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span>{darkMode ? "Light" : "Dark"} Mode</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === "appointments" && <AppointmentsView />}
        {activeTab === "pos" && <POSView />}
        {activeTab === "stock" && <StockView />}
        {activeTab === "staff" && <StaffView />}
        {activeTab === "analytics" && <AnalyticsView />}
      </main>
    </div>
  );
}

// Appointments View
function AppointmentsView() {
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      client: "Sarah Johnson",
      service: "Facial Treatment",
      time: "10:00 AM",
      staff: "Emma",
      status: "confirmed",
      loyalty: 450,
    },
    {
      id: 2,
      client: "Mike Brown",
      service: "Haircut",
      time: "11:30 AM",
      staff: "David",
      status: "pending",
      loyalty: 230,
    },
    {
      id: 3,
      client: "Lisa Chen",
      service: "Manicure",
      time: "2:00 PM",
      staff: "Sophie",
      status: "confirmed",
      loyalty: 680,
    },
  ]);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Appointments</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus size={20} />
          <span>New Appointment</span>
        </button>
      </div>

      <div className="grid gap-4">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{apt.client}</h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p className="flex items-center">
                    <Calendar size={16} className="mr-2" />
                    {apt.service}
                  </p>
                  <p className="flex items-center">
                    <Clock size={16} className="mr-2" />
                    {apt.time}
                  </p>
                  <p className="flex items-center">
                    <Users size={16} className="mr-2" />
                    Staff: {apt.staff}
                  </p>
                  <p className="flex items-center">
                    <TrendingUp size={16} className="mr-2" />
                    Loyalty: {apt.loyalty} points
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    apt.status === "confirmed"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {apt.status}
                </span>
                <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm">
                  Check In
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && <AppointmentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// POS View
function POSView() {
  const [cart, setCart] = useState([]);
  const [clientType, setClientType] = useState("walk-in");
  const [searchTerm, setSearchTerm] = useState("");

  const services = [
    { id: 1, name: "Facial Treatment", price: 85, category: "service" },
    { id: 2, name: "Haircut & Style", price: 65, category: "service" },
    { id: 3, name: "Manicure", price: 45, category: "service" },
    { id: 4, name: "Pedicure", price: 55, category: "service" },
  ];

  const products = [
    { id: 5, name: "Moisturizer", price: 35, stock: 15, category: "retail" },
    { id: 6, name: "Face Serum", price: 48, stock: 8, category: "retail" },
    { id: 7, name: "Hair Treatment", price: 42, stock: 12, category: "retail" },
  ];

  const allItems = [...services, ...products].filter((item) =>
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

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const loyaltyPoints = Math.floor(total * 10);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Point of Sale</h2>

      <div className="grid grid-cols-3 gap-6">
        {/* Items Section */}
        <div className="col-span-2 space-y-4">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setClientType("walk-in")}
              className={`px-4 py-2 rounded-lg ${
                clientType === "walk-in"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              Walk-in
            </button>
            <button
              onClick={() => setClientType("booked")}
              className={`px-4 py-2 rounded-lg ${
                clientType === "booked"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              Pre-booked
            </button>
            <button
              onClick={() => setClientType("retail")}
              className={`px-4 py-2 rounded-lg ${
                clientType === "retail"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              Retail Only
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services or products..."
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {allItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-colors text-left"
              >
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-purple-500 font-bold">${item.price}</p>
                {item.category === "retail" && (
                  <p className="text-xs text-gray-500">Stock: {item.stock}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 h-fit">
          <h3 className="text-xl font-bold mb-4">Cart</h3>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty</p>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.qty}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold">
                        ${item.price * item.qty}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-purple-500">
                  <span>Loyalty Points Earned:</span>
                  <span>+{loyaltyPoints}</span>
                </div>
              </div>

              <button className="w-full mt-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold">
                Process Payment
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Stock Management View
function StockView() {
  const [selectedLocation, setSelectedLocation] = useState("all");

  const stock = [
    {
      id: 1,
      name: "Moisturizer",
      storage: 45,
      treatment: 8,
      retail: 15,
      minStock: 20,
    },
    {
      id: 2,
      name: "Face Serum",
      storage: 22,
      treatment: 5,
      retail: 8,
      minStock: 15,
    },
    {
      id: 3,
      name: "Hair Treatment",
      storage: 18,
      treatment: 6,
      retail: 12,
      minStock: 20,
    },
    {
      id: 4,
      name: "Nail Polish",
      storage: 35,
      treatment: 12,
      retail: 18,
      minStock: 25,
    },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Stock Management</h2>
        <div className="flex space-x-4">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <option value="all">All Locations</option>
            <option value="storage">Storage</option>
            <option value="treatment">Treatment Rooms</option>
            <option value="retail">Retail Floor</option>
          </select>
          <button className="flex items-center space-x-2 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
            <Plus size={20} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-4 text-left">Product</th>
              <th className="px-6 py-4 text-center">Storage</th>
              <th className="px-6 py-4 text-center">Treatment</th>
              <th className="px-6 py-4 text-center">Retail</th>
              <th className="px-6 py-4 text-center">Total</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item) => {
              const total = item.storage + item.treatment + item.retail;
              const isLow = total < item.minStock;
              return (
                <tr
                  key={item.id}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-center">{item.storage}</td>
                  <td className="px-6 py-4 text-center">{item.treatment}</td>
                  <td className="px-6 py-4 text-center">{item.retail}</td>
                  <td className="px-6 py-4 text-center font-bold">{total}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isLow
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}
                    >
                      {isLow ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-purple-500 hover:text-purple-600 font-medium">
                      Transfer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Staff Management View
function StaffView() {
  const staff = [
    {
      id: 1,
      name: "Emma Wilson",
      role: "Senior Aesthetician",
      schedule: "Mon-Fri",
      phone: "555-0101",
      email: "emma@studio.com",
    },
    {
      id: 2,
      name: "David Chen",
      role: "Hair Stylist",
      schedule: "Tue-Sat",
      phone: "555-0102",
      email: "david@studio.com",
    },
    {
      id: 3,
      name: "Sophie Martinez",
      role: "Nail Technician",
      schedule: "Mon-Fri",
      phone: "555-0103",
      email: "sophie@studio.com",
    },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Staff Management</h2>
        <button className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
          <Plus size={20} />
          <span>Add Staff</span>
        </button>
      </div>

      <div className="grid gap-6">
        {staff.map((member) => (
          <div
            key={member.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <p className="text-purple-500 font-medium mb-3">
                  {member.role}
                </p>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>📅 Schedule: {member.schedule}</p>
                  <p>📞 {member.phone}</p>
                  <p>✉️ {member.email}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
                  Edit
                </button>
                <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                  Schedule
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Analytics View
function AnalyticsView() {
  const stats = [
    {
      label: "Revenue Today",
      value: "$2,450",
      change: "+12%",
      icon: DollarSign,
    },
    { label: "Appointments", value: "24", change: "+8%", icon: Calendar },
    { label: "Active Clients", value: "156", change: "+5%", icon: Users },
    { label: "Stock Value", value: "$8,920", change: "-3%", icon: Package },
  ];

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">Analytics</h2>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const isPositive = stat.change.startsWith("+");
          return (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className="text-purple-500" size={24} />
                <span
                  className={`text-sm font-medium ${
                    isPositive ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold mb-4">Top Services</h3>
          <div className="space-y-3">
            {[
              { name: "Facial Treatment", revenue: "$850", bookings: 12 },
              { name: "Haircut & Style", revenue: "$720", bookings: 15 },
              { name: "Manicure", revenue: "$540", bookings: 18 },
            ].map((service, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-gray-500">
                    {service.bookings} bookings
                  </p>
                </div>
                <span className="font-bold text-purple-500">
                  {service.revenue}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold mb-4">Top Clients</h3>
          <div className="space-y-3">
            {[
              { name: "Lisa Chen", points: 680, spent: "$2,150" },
              { name: "Sarah Johnson", points: 450, spent: "$1,890" },
              { name: "Mike Brown", points: 230, spent: "$980" },
            ].map((client, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-gray-500">
                    {client.points} loyalty points
                  </p>
                </div>
                <span className="font-bold text-purple-500">
                  {client.spent}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Appointment Modal
function AppointmentModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">New Appointment</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Client Name
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Service</label>
            <select className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
              <option>Facial Treatment</option>
              <option>Haircut & Style</option>
              <option>Manicure</option>
              <option>Pedicure</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Date & Time
            </label>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Staff Member
            </label>
            <select className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
              <option>Emma Wilson</option>
              <option>David Chen</option>
              <option>Sophie Martinez</option>
            </select>
          </div>

          <button
            type="button"
            className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold"
          >
            Book Appointment
          </button>
        </form>
      </div>
    </div>
  );
}
