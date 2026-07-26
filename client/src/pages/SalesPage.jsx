import { useMemo, useState } from 'react';
import { createSale } from '../services/api';
import { money, shortDate } from '../utils';

const regions = ['United States', 'Canada', 'European Union', 'United Kingdom', 'Australia', 'Japan', 'Other'];

function SalesPage({ products, sales, onRefresh, notify }) {
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
      notify('Sale recorded and inventory updated');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="split-page">
      <section className="panel sale-entry">
        <div className="panel-heading"><div><p className="overline">NEW TRANSACTION</p><h3>Record a Sale</h3></div></div>
        <form className="stack-form" onSubmit={submit}>
          <label>Product<select value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })} required><option value="">Select a product</option>{products.filter((product) => product.quantity > 0).map((product) => <option value={product.id} key={product.id}>{product.sku} · {product.name} ({product.quantity} available)</option>)}</select></label>
          {selected && <div className="selected-product"><span>{selected.name[0]}</span><div><strong>{selected.name}</strong><small>{money(selected.price)} each · {selected.quantity} available</small></div></div>}
          <div className="form-grid">
            <label>Quantity Sold<input type="number" min="1" max={selected?.quantity || undefined} value={form.quantity_sold} onChange={(event) => setForm({ ...form, quantity_sold: event.target.value })} required /></label>
            <label>Sales Channel<select value={form.sales_channel} onChange={(event) => setForm({ ...form, sales_channel: event.target.value })}><option>Online Store</option><option>Marketplace</option><option>Retail Pop-up</option><option>Wholesale</option></select></label>
          </div>
          <label>Destination Region<select value={form.destination_region} onChange={(event) => setForm({ ...form, destination_region: event.target.value })}>{regions.map((region) => <option key={region}>{region}</option>)}</select></label>
          <div className="sale-total"><span>Sale Total</span><strong>{money(selected ? selected.price * Number(form.quantity_sold || 0) : 0)}</strong></div>
          {error && <div className="message error">{error}</div>}
          <button className="primary-button full-button">Record Sale & Update Stock</button>
        </form>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading"><div><p className="overline">SALES LEDGER</p><h3>Recent Sales</h3></div><span className="muted-count">{sales.length} records</span></div>
        <div className="table-wrap">
          <table><thead><tr><th>Date</th><th>Product</th><th>Channel</th><th>Region</th><th>Units</th><th>Total</th></tr></thead>
          <tbody>{sales.map((sale) => <tr key={sale.id}><td>{shortDate(sale.sale_date)}</td><td><strong>{sale.product_name}</strong><small className="cell-note">{sale.sku}</small></td><td>{sale.sales_channel}</td><td>{sale.destination_region}</td><td>{sale.quantity_sold}</td><td><strong>{money(sale.total_price)}</strong></td></tr>)}</tbody></table>
          {!sales.length && <p className="empty-state">No sales have been recorded.</p>}
        </div>
      </section>
    </div>
  );
}

export default SalesPage;
