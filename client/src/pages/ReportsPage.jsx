import { money } from '../utils';
import { useI18n } from '../i18n';

function ReportsPage({ report, settings }) {
  const { t } = useI18n();
  const regions = report?.by_region || [];
  const maxRegion = Math.max(...regions.map((item) => Number(item.revenue)), 1);

  return (
    <>
      <section className="report-hero">
        <div><p className="overline light">{t('BUSINESS PERFORMANCE')}</p><h2>{money(report?.total_revenue, settings?.currency)}</h2><span>{t('Total revenue across {count} transactions', { count: report?.sales_count || 0 })}</span></div>
        <div><small>{t('Units Sold')}</small><strong>{report?.units_sold || 0}</strong></div>
        <div><small>{t('Inventory Retail Value')}</small><strong>{money(report?.inventory_retail_value, settings?.currency)}</strong></div>
        <div><small>{t('Best Seller')}</small><strong>{report?.best_seller?.name || t('No sales yet')}</strong></div>
      </section>
      <section className="dashboard-layout">
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">{t('GLOBAL SALES')}</p><h3>{t('Revenue by Region')}</h3></div></div>
          <div className="bar-chart region-bars">{regions.map((item) => <div className="bar-row" key={item.region}><span>{item.region}</span><div><i style={{ width: `${(Number(item.revenue) / maxRegion) * 100}%` }} /></div><strong>{money(item.revenue)}</strong></div>)}{!regions.length && <p className="empty-state">{t('Record sales to build regional reporting.')}</p>}</div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="overline">{t('MARGIN VIEW')}</p><h3>{t('Inventory Value')}</h3></div></div>
          <div className="value-comparison"><div><span>{t('Retail Value')}</span><strong>{money(report?.inventory_retail_value)}</strong><i style={{ width: '100%' }} /></div><div><span>{t('Inventory Cost')}</span><strong>{money(report?.inventory_cost)}</strong><i style={{ width: `${report?.inventory_retail_value ? (report.inventory_cost / report.inventory_retail_value) * 100 : 0}%` }} /></div><p>{t('Potential gross inventory value:')} <strong>{money((report?.inventory_retail_value || 0) - (report?.inventory_cost || 0))}</strong></p></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="overline">{t('CATEGORY ANALYSIS')}</p><h3>{t('Inventory Distribution')}</h3></div></div>
        <div className="category-report-grid">{(report?.by_category || []).map((item, index) => <article key={item.category}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.category}</strong><small>{t('Current units on hand')}</small></div><b>{item.quantity}</b></article>)}</div>
      </section>
    </>
  );
}

export default ReportsPage;
