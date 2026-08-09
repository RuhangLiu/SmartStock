import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import DatabasePage from './pages/DatabasePage';
import { useI18n } from './i18n';
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
  logout,
  signup,
  storeToken
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
  { id: 'settings', label: 'Settings', icon: '⚙' },
  { id: 'database', label: 'Database', icon: '▧', adminOnly: true }
];

const pageMeta = {
  dashboard: ['Inventory & Sales Dashboard', 'Live global operations overview'],
  products: ['Product Management', 'Build and maintain your tie-dye catalog'],
  inventory: ['Inventory Control', 'Monitor stock levels and replenishment'],
  sales: ['Sales Entry', 'Record sales and update stock automatically'],
  orders: ['Order Management', 'Track purchase and international orders'],
  customers: ['Customer Directory', 'Manage cross-border customer records'],
  reports: ['Business Reports', 'Sales and inventory performance'],
  settings: ['Store Settings', 'Workspace and account configuration'],
  database: ['Database Viewer', 'Secure read-only access to application data']
};

function LanguageToggle({ className = '' }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className={`language-toggle ${className}`} role="group" aria-label={t('Switch interface language')}>
      <button className={language === 'en' ? 'active' : ''} type="button" onClick={() => setLanguage('en')}>EN</button>
      <span>/</span>
      <button className={language === 'zh' ? 'active' : ''} type="button" onClick={() => setLanguage('zh')}>中文</button>
    </div>
  );
}

function AuthScreen({ onLogin, onSignup }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'admin@smartstock.com', password: 'admin123', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setForm(nextMode === 'signup'
      ? { name: '', email: '', password: '', confirmPassword: '' }
      : { name: '', email: 'admin@smartstock.com', password: 'admin123', confirmPassword: '' });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isSignup) {
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match');
        await onSignup({ name: form.name, email: form.email, password: form.password });
      } else {
        await onLogin({ email: form.email, password: form.password });
      }
    } catch (err) {
      setError(t(err.message));
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
          <span>SmartStock<small>{t('TIE-DYE RETAIL OPERATIONS')}</small></span>
        </div>
        <div>
          <p className="overline light">{t('INVENTORY · SALES · INSIGHT')}</p>
          <h1>{t('Run the store.')}<br />{t('Respect the craft.')}</h1>
          <p>{t('One workspace for products, inventory, sales, and cross-border operations.')}</p>
        </div>
        <p className="login-footnote">Indigo Trail Studio · {t('Global Store')}</p>
      </section>
      <section className="login-form-panel">
        <LanguageToggle className="auth-language-toggle" />
        <form className={`login-form ${isSignup ? 'signup-form' : ''}`} onSubmit={submit}>
          <div className="auth-tabs" role="tablist" aria-label={t('Account access')}>
            <button type="button" className={!isSignup ? 'active' : ''} onClick={() => switchMode('login')}>{t('Sign In')}</button>
            <button type="button" className={isSignup ? 'active' : ''} onClick={() => switchMode('signup')}>{t('Create Account')}</button>
          </div>
          <p className="overline">{t(isSignup ? 'JOIN THE WORKSPACE' : 'WELCOME BACK')}</p>
          <h2>{t(isSignup ? 'Create your SmartStock account' : 'Sign in to SmartStock')}</h2>
          <p className="form-note">{t(isSignup ? 'Register as a store employee to access inventory and sales tools.' : 'Use your staff account to access the store workspace.')}</p>
          {isSignup && <label>{t('Full name')}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t('Your full name')} required /></label>}
          <label>{t('Email address')}<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>{t('Password')}<input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={isSignup ? t('At least 8 characters') : ''} required /></label>
          {isSignup && <label>{t('Confirm password')}<input type="password" minLength="8" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required /></label>}
          {error && <div className="message error">{error}</div>}
          <button className="primary-button full-button" disabled={busy}>{t(busy ? (isSignup ? 'Creating account…' : 'Signing in…') : (isSignup ? 'Create Account →' : 'Sign In →'))}</button>
          {!isSignup && <div className="demo-accounts">
            <strong>{t('Demo accounts')}</strong>
            <span>{t('Admin')}: admin@smartstock.com / admin123</span>
            <span>{t('Employee')}: employee@smartstock.com / employee123</span>
          </div>}
          {isSignup && <p className="signup-note">{t('New accounts use the employee role. An administrator can promote or manage staff access.')}</p>}
        </form>
      </section>
    </main>
  );
}

function App() {
  const { t } = useI18n();
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
      else notify(t(error.message));
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

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

  useEffect(() => {
    if (user && user.role !== 'admin' && currentPage === 'database') setCurrentPage('dashboard');
  }, [currentPage, user]);

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    storeToken(result.token);
    setUser(result.user);
  };

  const handleSignup = async (details) => {
    const result = await signup(details);
    storeToken(result.token);
    setUser(result.user);
  };

  const handleLogout = async () => {
    try { await logout(); } catch { /* session may already be expired */ }
    clearToken();
    setUser(null);
    setCurrentPage('dashboard');
    setData({ products: [], lowStock: [], sales: [], orders: [], customers: [], report: null, settings: null });
  };

  const exportInventory = () => {
    const headers = ['SKU', 'Product', 'Origin', 'Material', 'Dye Technique', 'Category', 'Price USD', 'Cost USD', 'Quantity', 'Threshold', 'Image URL'];
    const rows = data.products.map((product) => [
      product.sku, product.name, product.origin, product.material, product.dye_technique,
      product.category, product.price, product.cost, product.quantity, product.low_stock_threshold, product.image_url
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')
    ).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `smartstock-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify(t('Inventory CSV exported'));
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
    if (currentPage === 'database') return <DatabasePage {...common} />;
    return <DashboardPage {...common} onNavigate={setCurrentPage} />;
  }, [currentPage, data, loading, user, loadData, notify]);

  if (booting) return <div className="app-loader">{t('Loading SmartStock…')}</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} onSignup={handleSignup} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label={t('Close menu')}>×</button>
        <div className="app-brand"><span className="brand-symbol">SS</span><span>SmartStock<small>{t('TIE-DYE RETAIL OPS')}</small></span></div>
        <p className="nav-label">{t('WORKSPACE')}</p>
        <nav>
          {navigation.filter((item) => !item.adminOnly || user.role === 'admin').map((item) => (
            <button key={item.id} className={currentPage === item.id ? 'active' : ''} onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}>
              <span className="nav-icon">{item.icon}</span>{t(item.label)}
              {item.id === 'inventory' && data.lowStock.length > 0 && <b>{data.lowStock.length}</b>}
            </button>
          ))}
        </nav>
        <div className="store-card">
          <span className="store-avatar">IT</span>
          <div><strong>{data.settings?.store_name || 'Indigo Trail Studio'}</strong><small>{t('Global Store')} · {data.settings?.currency || 'USD'}</small></div>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label={t('Close menu')} />}

      <div className="main-shell">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label={t('Open menu')}>☰</button>
          <div className="topbar-title"><h1>{t(pageMeta[currentPage][0])}</h1><p>{t(pageMeta[currentPage][1])}</p></div>
          <div className="topbar-actions">
            <LanguageToggle />
            <button className="export-button" onClick={exportInventory}>↓ {t('Export Inventory')}</button>
            <span className="online-badge">● {t('System Online')}</span>
            <button className="profile-button" onClick={handleLogout} title={t('Sign out')}>
              <span>{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
              <div><strong>{user.name}</strong><small>{t(user.role === 'admin' ? 'Admin' : 'Employee')}</small></div>
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
