const API_BASE = '/api';
const TOKEN_KEY = 'smartstock_auth_token';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const storeToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') clearToken();
    throw new Error(payload.message || 'Request failed');
  }
  return payload.data;
}

export const login = (credentials) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const getMe = () => request('/auth/me');
export const logout = () => request('/auth/logout', { method: 'POST' });
export const registerUser = (user) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(user) });

export const fetchProducts = (search = '') =>
  request(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const fetchLowStockProducts = () => request('/products/low-stock');
export const addProduct = (product) =>
  request('/products', { method: 'POST', body: JSON.stringify(product) });
export const editProduct = (id, product) =>
  request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(product) });
export const deleteProduct = (id) => request(`/products/${id}`, { method: 'DELETE' });

export const fetchSales = () => request('/sales');
export const createSale = (sale) =>
  request('/sales', { method: 'POST', body: JSON.stringify(sale) });
export const fetchReport = () => request('/sales/report');

export const fetchOrders = () => request('/orders');
export const addOrder = (order) =>
  request('/orders', { method: 'POST', body: JSON.stringify(order) });
export const updateOrder = (id, status) =>
  request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });

export const fetchCustomers = () => request('/customers');
export const addCustomer = (customer) =>
  request('/customers', { method: 'POST', body: JSON.stringify(customer) });

export const fetchSettings = () => request('/settings');
export const updateSettings = (settings) =>
  request('/settings', { method: 'PUT', body: JSON.stringify(settings) });
