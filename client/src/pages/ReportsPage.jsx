import { money } from '../utils';

function ReportsPage({ report, settings }) {
  const regions = report?.by_region || [];
  const maxRegion = Math.max(...regions.map((item) => Number(item.revenue)), 1);

  return (
    <>
      <section className="report-hero">
        <div><p className="overline light">BUSINESS PERFORMANCE</p><h2>{money(report?.total_revenue, settings?.currency)}</h2><span>Total revenue across {report?.sales_count || 0} transactions</span></div>
        <div><small>Units Sold</small><strong>{report?.units_sold || 0}</strong></div>
        <div><small>Inventory Retail Value</small><strong>{money(report?.inventory_retail_value, settings?.currency)}</strong></div>
        <div><small>Best Seller</small><strong>{report?.best_seller?.name || 'No sales yet'}</strong></div>
      </section>
      <section className="dashboard-layout">
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">GLOBAL SALES</p><h3>Revenue by Region</h3></div></div>
          <div className="bar-chart region-bars">{regions.map((item) => <div className="bar-row" key={item.region}><span>{item.region}</span><div><i style={{ width: `${(Number(item.revenue) / maxRegion) * 100}%` }} /></div><strong>{money(item.revenue)}</strong></div>)}{!regions.length && <p className="empty-state">Record sales to build regional reporting.</p>}</div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">MARGIN VIEW</p><h3>Inventory Value</h3></div></div>
          <div className="value-comparison"><div><span>Retail Value</span><strong>{money(report?.inventory_retail_value)}</strong><i style={{ width: '100%' }} /></div><div><span>Inventory Cost</span><strong>{money(report?.inventory_cost)}</strong><i style={{ width: `${report?.inventory_retail_value ? (report.inventory_cost / report.inventory_retail_value) * 100 : 0}%` }} /></div><p>Potential gross inventory value: <strong>{money((report?.inventory_retail_value || 0) - (report?.inventory_cost || 0))}</strong></p></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="overline">CATEGORY ANALYSIS</p><h3>Inventory Distribution</h3></div></div>
        <div className="category-report-grid">{(report?.by_category || []).map((item, index) => <article key={item.category}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.category}</strong><small>Current units on hand</small></div><b>{item.quantity}</b></article>)}</div>
      </section>
    </>
  );
}

export default ReportsPage;
