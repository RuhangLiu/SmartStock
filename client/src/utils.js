export const money = (value, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));

export const shortDate = (value) =>
  value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`)) : '—';

export const stockStatus = (product) => {
  if (Number(product.quantity) === 0) return { label: 'Out of Stock', className: 'danger' };
  if (Number(product.quantity) <= Number(product.low_stock_threshold)) return { label: 'Low Stock', className: 'warning' };
  return { label: 'In Stock', className: 'success' };
};

export const orderStatusClass = (status) => {
  if (status === 'Delivered') return 'success';
  if (status === 'Cancelled') return 'danger';
  if (status === 'In Transit') return 'info';
  return 'warning';
};
