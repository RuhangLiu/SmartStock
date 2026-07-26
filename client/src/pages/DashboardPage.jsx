import { money, orderStatusClass, stockStatus } from '../utils';

function MetricCard({ label, value, note, tone = 'indigo', icon }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-head"><span>{label}</span><i>{icon}</i></div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function DashboardPage({ products, lowStock, orders, customers, report, settings, user, loading, onNavigate }) {
  const categories = report?.by_category || [];
  const maxCategory = Math.max(...categories.map((item) => Number(item.quantity)), 1);
  const inventoryTotal = Number(report?.total_inventory || 0);

  return (
    <div className={loading ? 'content-loading' : ''}>
      <section className="welcome-banner">
        <div>
          <p className="overline">INDIGO TRAIL · CROSS-BORDER RETAIL</p>
          <h2>Good afternoon, {user.name.split(' ')[0]}.</h2>
          <p>Your tie-dye store is ready. Review stock, record sales, and monitor global operations from one workspace.</p>
          <button onClick={() => onNavigate('sales')}>Record a Sale →</button>
        </div>
        <div className="banner-art"><span>PLANT<br />DYED</span></div>
      </section>

      <section className="metric-grid">
        <MetricCard label="Total Products" value={report?.total_products || products.length} note={`${categories.length} active categories`} icon="◇" />
        <MetricCard label="Inventory Units" value={inventoryTotal.toLocaleString()} note={`${money(report?.inventory_retail_value)} retail value`} tone="blue" icon="▦" />
        <MetricCard label="Total Revenue" value={money(report?.total_revenue, settings?.currency)} note={`${report?.units_sold || 0} units sold`} tone="green" icon="↗" />
        <MetricCard label="Low Stock Items" value={report?.low_stock_count || lowStock.length} note={lowStock.length ? 'Needs attention' : 'Inventory healthy'} tone="orange" icon="!" />
        <MetricCard label="Open Orders" value={report?.pending_orders || 0} note={`${orders.length} total orders`} tone="blue" icon="▤" />
        <MetricCard label="Customers" value={report?.total_customers || customers.length} note="Across global regions" tone="green" icon="◎" />
        <MetricCard label="Inventory Cost" value={money(report?.inventory_cost, settings?.currency)} note="Current landed cost" tone="indigo" icon="$" />
        <MetricCard label="Best Seller" value={report?.best_seller?.name || 'No sales yet'} note={report?.best_seller ? `${report.best_seller.units} units sold` : 'Record a sale to begin'} tone="orange" icon="★" />
      </section>

      <section className="dashboard-layout">
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">INVENTORY MIX</p><h3>Stock by Category</h3></div><button className="text-button" onClick={() => onNavigate('inventory')}>View inventory →</button></div>
          <div className="bar-chart">
            {categories.map((item) => (
              <div className="bar-row" key={item.category}>
                <span>{item.category}</span>
                <div><i style={{ width: `${(Number(item.quantity) / maxCategory) * 100}%` }} /></div>
                <strong>{item.quantity}</strong>
              </div>
            ))}
            {!categories.length && <p className="empty-state">No inventory data available.</p>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">STOCK HEALTH</p><h3>Inventory Overview</h3></div></div>
          <div className="stock-donut-wrap">
            <div className="stock-donut" style={{ '--healthy': `${inventoryTotal ? Math.max(0, 100 - (lowStock.length / Math.max(products.length, 1)) * 100) : 0}%` }}>
              <span><strong>{products.length - lowStock.length}</strong>Healthy SKUs</span>
            </div>
            <div className="legend"><span><i className="legend-healthy" />In Stock</span><span><i className="legend-low" />Low / Out</span></div>
          </div>
        </div>
      </section>

      <section className="dashboard-layout lower">
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">ACTION REQUIRED</p><h3>Low Stock Alerts</h3></div><span className="count-badge">{lowStock.length}</span></div>
          <div className="alert-list">
            {lowStock.map((product) => {
              const status = stockStatus(product);
              return <div className="alert-row" key={product.id}><span className="product-initial">{product.name[0]}</span><div><strong>{product.name}</strong><small>{product.sku} · Threshold {product.low_stock_threshold}</small></div><div className="align-right"><span className={`status ${status.className}`}>{status.label}</span><small>{product.quantity} left</small></div></div>;
            })}
            {!lowStock.length && <p className="empty-state">No low-stock products. Everything looks healthy.</p>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">OPERATIONS</p><h3>Recent Orders</h3></div><button className="text-button" onClick={() => onNavigate('orders')}>View all →</button></div>
          <div className="compact-table">
            {orders.slice(0, 5).map((order) => (
              <div className="compact-row" key={order.id}><div><strong>{order.product_name}</strong><small>{order.destination_region} · {order.order_type}</small></div><span>{order.quantity} units</span><span className={`status ${orderStatusClass(order.status)}`}>{order.status}</span></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
