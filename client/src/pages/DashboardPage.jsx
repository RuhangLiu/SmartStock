import { useEffect, useState } from 'react';
import { money, orderStatusClass, stockStatus } from '../utils';
import { useI18n } from '../i18n';
import { generateAiBriefing } from '../services/api';

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
  const { language, t } = useI18n();
  const [briefing, setBriefing] = useState(null);
  const [briefingError, setBriefingError] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const categories = report?.by_category || [];
  const maxCategory = Math.max(...categories.map((item) => Number(item.quantity)), 1);
  const inventoryTotal = Number(report?.total_inventory || 0);

  useEffect(() => {
    setBriefing(null);
    setBriefingError('');
  }, [language]);

  const generateBriefing = async (event) => {
    event?.preventDefault();
    setBriefingLoading(true);
    setBriefingError('');
    try {
      setBriefing(await generateAiBriefing(language));
    } catch (error) {
      setBriefingError(t(error.message));
    } finally {
      setBriefingLoading(false);
    }
  };

  const generatedAt = briefing?.generated_at
    ? new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
      dateStyle: 'medium', timeStyle: 'short'
    }).format(new Date(briefing.generated_at))
    : '';

  return (
    <div className={loading ? 'content-loading' : ''}>
      <section className="welcome-banner">
        <div>
          <p className="overline">{t('INDIGO TRAIL · CROSS-BORDER RETAIL')}</p>
          <h2>{t('Good afternoon, {name}.', { name: user.name.split(' ')[0] })}</h2>
          <p>{t('Your tie-dye store is ready. Review stock, record sales, and monitor global operations from one workspace.')}</p>
          <button onClick={() => onNavigate('sales')}>{t('Record a Sale →')}</button>
        </div>
        <div className="banner-art"><span>{t('PLANT')}<br />{t('DYED')}</span></div>
      </section>

      <section className="metric-grid">
        <MetricCard label={t('Total Products')} value={report?.total_products || products.length} note={t('{count} active categories', { count: categories.length })} icon="◇" />
        <MetricCard label={t('Inventory Units')} value={inventoryTotal.toLocaleString()} note={t('{value} retail value', { value: money(report?.inventory_retail_value) })} tone="blue" icon="▦" />
        <MetricCard label={t('Total Revenue')} value={money(report?.total_revenue, settings?.currency)} note={t('{count} units sold', { count: report?.units_sold || 0 })} tone="green" icon="↗" />
        <MetricCard label={t('Low Stock Items')} value={report?.low_stock_count || lowStock.length} note={t(lowStock.length ? 'Needs attention' : 'Inventory healthy')} tone="orange" icon="!" />
        <MetricCard label={t('Open Orders')} value={report?.pending_orders || 0} note={t('{count} total orders', { count: orders.length })} tone="blue" icon="▤" />
        <MetricCard label={t('Customers')} value={report?.total_customers || customers.length} note={t('Across global regions')} tone="green" icon="◎" />
        <MetricCard label={t('Inventory Cost')} value={money(report?.inventory_cost, settings?.currency)} note={t('Current landed cost')} tone="indigo" icon="$" />
        <MetricCard label={t('Best Seller')} value={report?.best_seller?.name || t('No sales yet')} note={report?.best_seller ? t('{count} units sold', { count: report.best_seller.units }) : t('Record a sale to begin')} tone="orange" icon="★" />
      </section>

      {user.role === 'admin' && (
        <section className={`panel ai-briefing-panel ${briefing ? 'has-briefing' : ''}`}>
          <div className="ai-briefing-heading">
            <div className="ai-briefing-title">
              <span className="ai-symbol">AI</span>
              <div>
                <p className="overline">{t('READ-ONLY OPERATIONS INSIGHT')}</p>
                <h3>{t('AI Operations Briefing')}</h3>
                <p>{t('Review a concise summary built from approved inventory, sales, and order data.')}</p>
              </div>
            </div>
            <form className="ai-briefing-actions" onSubmit={generateBriefing}>
              <span className="preview-badge">● {t(
                briefing?.mode === 'azure-ai'
                  ? 'AZURE AI'
                  : briefing?.mode === 'local-fallback'
                    ? 'LOCAL FALLBACK'
                    : 'SECURE AI'
              )}</span>
              <button className="primary-button" type="submit" disabled={briefingLoading}>
                {t(briefingLoading ? 'Generating briefing…' : briefing ? 'Refresh Briefing' : 'Generate AI Briefing')}
              </button>
            </form>
          </div>

          {briefingError && <div className="message error">{briefingError}</div>}

          {!briefing && !briefingLoading && (
            <div className="ai-briefing-empty">
              <div>
                <strong>{t('See what needs attention now')}</strong>
                <p>{t('AI reviews approved operational summaries only. If Azure is unavailable, a safe local summary is used automatically.')}</p>
              </div>
              <div className="ai-scope-list">
                <span>✓ {t('Inventory health')}</span>
                <span>✓ {t('Recent sales')}</span>
                <span>✓ {t('Open orders')}</span>
                <span>✓ {t('No database changes')}</span>
              </div>
            </div>
          )}

          {briefingLoading && (
            <div className="ai-briefing-loading" role="status">
              <span /><div><strong>{t('Reviewing approved data…')}</strong><small>{t('Inventory · Sales · Orders')}</small></div>
            </div>
          )}

          {briefing && !briefingLoading && (
            <div className="ai-briefing-content">
              <div className="ai-summary">
                <span>{t('EXECUTIVE SUMMARY')}</span>
                <p>{briefing.summary}</p>
                <small>{t('Generated {time} · Read only', { time: generatedAt })}</small>
              </div>
              <div className="ai-insight-grid">
                {briefing.insights.map((insight, index) => (
                  <article className={`ai-insight ${insight.tone}`} key={`${insight.title}-${index}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div><strong>{insight.title}</strong><p>{insight.detail}</p></div>
                  </article>
                ))}
              </div>
              <div className="ai-scope-footer">
                <span>{t('{count} products', { count: briefing.scope.products })}</span>
                <span>{t('{count} low-stock items', { count: briefing.scope.low_stock_items })}</span>
                <span>{t('{count} open orders', { count: briefing.scope.open_orders })}</span>
                <span>{t('30-day sales window')}</span>
                <span className="read-only-chip">🔒 {t('Read only')}</span>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="dashboard-layout">
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">{t('INVENTORY MIX')}</p><h3>{t('Stock by Category')}</h3></div><button className="text-button" onClick={() => onNavigate('inventory')}>{t('View inventory →')}</button></div>
          <div className="bar-chart">
            {categories.map((item) => (
              <div className="bar-row" key={item.category}>
                <span>{item.category}</span>
                <div><i style={{ width: `${(Number(item.quantity) / maxCategory) * 100}%` }} /></div>
                <strong>{item.quantity}</strong>
              </div>
            ))}
            {!categories.length && <p className="empty-state">{t('No inventory data available.')}</p>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">{t('STOCK HEALTH')}</p><h3>{t('Inventory Overview')}</h3></div></div>
          <div className="stock-donut-wrap">
            <div className="stock-donut" style={{ '--healthy': `${inventoryTotal ? Math.max(0, 100 - (lowStock.length / Math.max(products.length, 1)) * 100) : 0}%` }}>
              <span><strong>{products.length - lowStock.length}</strong>{t('Healthy SKUs')}</span>
            </div>
            <div className="legend"><span><i className="legend-healthy" />{t('In Stock')}</span><span><i className="legend-low" />{t('Low / Out')}</span></div>
          </div>
        </div>
      </section>

      <section className="dashboard-layout lower">
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">{t('ACTION REQUIRED')}</p><h3>{t('Low Stock Alerts')}</h3></div><span className="count-badge">{lowStock.length}</span></div>
          <div className="alert-list">
            {lowStock.map((product) => {
              const status = stockStatus(product);
              return <div className="alert-row" key={product.id}><span className="product-initial">{product.name[0]}</span><div><strong>{product.name}</strong><small>{product.sku} · {t('Threshold {value}', { value: product.low_stock_threshold })}</small></div><div className="align-right"><span className={`status ${status.className}`}>{t(status.label)}</span><small>{t('{count} left', { count: product.quantity })}</small></div></div>;
            })}
            {!lowStock.length && <p className="empty-state">{t('No low-stock products. Everything looks healthy.')}</p>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">{t('OPERATIONS')}</p><h3>{t('Recent Orders')}</h3></div><button className="text-button" onClick={() => onNavigate('orders')}>{t('View all →')}</button></div>
          <div className="compact-table">
            {orders.slice(0, 5).map((order) => (
              <div className="compact-row" key={order.id}><div><strong>{order.product_name}</strong><small>{order.destination_region} · {t(order.order_type)}</small></div><span>{t('{count} units', { count: order.quantity })}</span><span className={`status ${orderStatusClass(order.status)}`}>{t(order.status)}</span></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
