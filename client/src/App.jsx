import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import {
  clearToken,
  fetchCustomers,
  fetchLowStockProducts,
  fetchOrders,
  fetchProducts,
  fetchReport,
  fetchSales,
  fetchSettings,
  getMe,
  getStoredToken,
  login,
  logout
} from './services/api';
import './App.css';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'products', label: 'Products', icon: '◇' },
  { id: 'inventory', label: 'Inventory', icon: '▦' },
  { id: 'sales', label: 'Sales', icon: '↗' },
  { id: 'orders', label: 'Orders', icon: '▤' },
  { id: 'customers', label: 'Customers', icon: '◎' },
  { id: 'reports', label: 'Reports', icon: '◫' },
  { id: 'settings', label: 'Settings', icon: '⚙' }
];

const pageMeta = {
  dashboard: ['Inventory & Sales Dashboard', 'Live global operations overview'],
  products: ['Product Management', 'Build and maintain your tie-dye catalog'],
  inventory: ['Inventory Control', 'Monitor stock levels and replenishment'],
  sales: ['Sales Entry', 'Record sales and update stock automatically'],
  orders: ['Order Management', 'Track purchase and international orders'],
  customers: ['Customer Directory', 'Manage cross-border customer records'],
  reports: ['Business Reports', 'Sales and inventory performance'],
  settings: ['Store Settings', 'Workspace and account configuration']
};

function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ email: 'admin@smartstock.com', password: 'admin123' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-brand-panel">
        <div className="dye-rings" />
        <div className="login-brand">
          <span className="brand-symbol">SS</span>
          <span>SmartStock<small>TIE-DYE RETAIL OPERATIONS</small></span>
        </div>
        <div>
          <p className="overline light">INVENTORY · SALES · INSIGHT</p>
          <h1>Run the store.<br />Respect the craft.</h1>
          <p>One workspace for products, inventory, sales, and cross-border operations.</p>
        </div>
        <p className="login-footnote">Indigo Trail Studio · Global Store</p>
      </section>
      <section className="login-form-panel">
        <form className="login-form" onSubmit={submit}>
          <p className="overline">WELCOME BACK</p>
          <h2>Sign in to SmartStock</h2>
          <p className="form-note">Use your staff account to access the store workspace.</p>
          <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
          {error && <div className="message error">{error}</div>}
          <button className="primary-button full-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign In →'}</button>
          <div className="demo-accounts">
            <strong>Demo accounts</strong>
            <span>Admin: admin@smartstock.com / admin123</span>
            <span>Employee: employee@smartstock.com / employee123</span>
          </div>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(getStoredToken()));
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState({
    products: [], lowStock: [], sales: [], orders: [], customers: [], report: null, settings: null
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [products, lowStock, sales, orders, customers, report, settings] = await Promise.all([
        fetchProducts(), fetchLowStockProducts(), fetchSales(), fetchOrders(),
        fetchCustomers(), fetchReport(), fetchSettings()
      ]);
      setData({ products, lowStock, sales, orders, customers, report, settings });
    } catch (error) {
      if (!getStoredToken()) setUser(null);
      else notify(error.message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!getStoredToken()) return;
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    localStorage.setItem('smartstock_auth_token', result.token);
    setUser(result.user);
  };

  const handleLogout = async () => {
    try { await logout(); } catch { /* session may already be expired */ }
    clearToken();
    setUser(null);
    setData({ products: [], lowStock: [], sales: [], orders: [], customers: [], report: null, settings: null });
  };

  const exportInventory = () => {
    const headers = ['SKU', 'Product', 'Origin', 'Material', 'Dye Technique', 'Category', 'Price USD', 'Cost USD', 'Quantity', 'Threshold'];
    const rows = data.products.map((product) => [
      product.sku, product.name, product.origin, product.material, product.dye_technique,
      product.category, product.price, product.cost, product.quantity, product.low_stock_threshold
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')
    ).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `smartstock-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify('Inventory CSV exported');
  };

  const content = useMemo(() => {
    const common = { ...data, loading, user, onRefresh: loadData, notify };
    if (currentPage === 'products') return <ProductsPage {...common} />;
    if (currentPage === 'inventory') return <InventoryPage {...common} />;
    if (currentPage === 'sales') return <SalesPage {...common} />;
    if (currentPage === 'orders') return <OrdersPage {...common} />;
    if (currentPage === 'customers') return <CustomersPage {...common} />;
    if (currentPage === 'reports') return <ReportsPage {...common} />;
    if (currentPage === 'settings') return <SettingsPage {...common} />;
    return <DashboardPage {...common} onNavigate={setCurrentPage} />;
  }, [currentPage, data, loading, user, loadData, notify]);

  if (booting) return <div className="app-loader">Loading SmartStock…</div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
        <div className="app-brand"><span className="brand-symbol">SS</span><span>SmartStock<small>TIE-DYE RETAIL OPS</small></span></div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navigation.map((item) => (
            <button key={item.id} className={currentPage === item.id ? 'active' : ''} onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}>
              <span className="nav-icon">{item.icon}</span>{item.label}
              {item.id === 'inventory' && data.lowStock.length > 0 && <b>{data.lowStock.length}</b>}
            </button>
          ))}
        </nav>
        <div className="store-card">
          <span className="store-avatar">IT</span>
          <div><strong>{data.settings?.store_name || 'Indigo Trail Studio'}</strong><small>Global Store · {data.settings?.currency || 'USD'}</small></div>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}

      <div className="main-shell">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <div><h1>{pageMeta[currentPage][0]}</h1><p>{pageMeta[currentPage][1]}</p></div>
          <div className="topbar-actions">
            <button className="export-button" onClick={exportInventory}>↓ Export Inventory</button>
            <span className="online-badge">● System Online</span>
            <button className="profile-button" onClick={handleLogout} title="Sign out">
              <span>{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
              <div><strong>{user.name}</strong><small>{user.role}</small></div>
            </button>
          </div>
        </header>
        <main className="workspace">{content}</main>
      </div>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}

export default App;
