import { useMemo, useState } from 'react';
import { createSale } from '../services/api';
import { money, shortDate } from '../utils';
import { useI18n } from '../i18n';

const regions = ['United States', 'Canada', 'European Union', 'United Kingdom', 'Australia', 'Japan', 'Other'];

function SalesPage({ products, sales, onRefresh, notify }) {
  const { language, t } = useI18n();
  const [form, setForm] = useState({ product_id: '', quantity_sold: 1, destination_region: 'United States', sales_channel: 'Online Store' });
  const [error, setError] = useState('');
  const selected = useMemo(() => products.find((product) => product.id === Number(form.product_id)), [products, form.product_id]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await createSale({ ...form, product_id: Number(form.product_id), quantity_sold: Number(form.quantity_sold) });
      setForm({ ...form, product_id: '', quantity_sold: 1 });
      await onRefresh();
      notify(t('Sale recorded and inventory updated'));
    } catch (err) { setError(t(err.message)); }
  };

  return (
    <div className="split-page">
      <section className="panel sale-entry">
        <div className="panel-heading"><div><p className="overline">{t('NEW TRANSACTION')}</p><h3>{t('Record a Sale')}</h3></div></div>
        <form className="stack-form" onSubmit={submit}>
          <label>{t('Product')}<select value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })} required><option value="">{t('Select a product')}</option>{products.filter((product) => product.quantity > 0).map((product) => <option value={product.id} key={product.id}>{product.sku} · {product.name} ({t('{count} available', { count: product.quantity })})</option>)}</select></label>
          {selected && <div className="selected-product"><span>{selected.name[0]}</span><div><strong>{selected.name}</strong><small>{t('{price} each · {count} available', { price: money(selected.price), count: selected.quantity })}</small></div></div>}
          <div className="form-grid">
            <label>{t('Quantity Sold')}<input type="number" min="1" max={selected?.quantity || undefined} value={form.quantity_sold} onChange={(event) => setForm({ ...form, quantity_sold: event.target.value })} required /></label>
            <label>{t('Sales Channel')}<select value={form.sales_channel} onChange={(event) => setForm({ ...form, sales_channel: event.target.value })}><option value="Online Store">{t('Online Store')}</option><option value="Marketplace">{t('Marketplace')}</option><option value="Retail Pop-up">{t('Retail Pop-up')}</option><option value="Wholesale">{t('Wholesale')}</option></select></label>
          </div>
          <label>{t('Destination Region')}<select value={form.destination_region} onChange={(event) => setForm({ ...form, destination_region: event.target.value })}>{regions.map((region) => <option value={region} key={region}>{t(region)}</option>)}</select></label>
          <div className="sale-total"><span>{t('Sale Total')}</span><strong>{money(selected ? selected.price * Number(form.quantity_sold || 0) : 0)}</strong></div>
          {error && <div className="message error">{error}</div>}
          <button className="primary-button full-button">{t('Record Sale & Update Stock')}</button>
        </form>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading"><div><p className="overline">{t('SALES LEDGER')}</p><h3>{t('Recent Sales')}</h3></div><span className="muted-count">{t('{count} records', { count: sales.length })}</span></div>
        <div className="table-wrap">
          <table><thead><tr><th>{t('Date')}</th><th>{t('Product')}</th><th>{t('Channel')}</th><th>{t('Region')}</th><th>{t('Units')}</th><th>{t('Total')}</th></tr></thead>
          <tbody>{sales.map((sale) => <tr key={sale.id}><td>{shortDate(sale.sale_date, language === 'zh' ? 'zh-CN' : 'en-US')}</td><td><strong>{sale.product_name}</strong><small className="cell-note">{sale.sku}</small></td><td>{sale.sales_channel}</td><td>{sale.destination_region}</td><td>{sale.quantity_sold}</td><td><strong>{money(sale.total_price)}</strong></td></tr>)}</tbody></table>
          {!sales.length && <p className="empty-state">{t('No sales have been recorded.')}</p>}
        </div>
      </section>
    </div>
  );
}

export default SalesPage;
