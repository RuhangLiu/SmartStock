import { useState } from 'react';
import { addOrder, updateOrder } from '../services/api';
import { orderStatusClass, shortDate } from '../utils';
import { useI18n } from '../i18n';

const initialForm = { supplier: '', product_name: '', quantity: '', status: 'Pending', destination_region: 'China', order_type: 'Purchase' };
const statuses = ['Pending', 'Processing', 'In Transit', 'Delivered', 'Cancelled'];

function OrdersPage({ orders, user, onRefresh, notify }) {
  const { language, t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState('All');
  const visible = filter === 'All' ? orders : orders.filter((order) => order.order_type === filter);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await addOrder({ ...form, quantity: Number(form.quantity) });
      setForm(initialForm);
      setShowForm(false);
      await onRefresh();
      notify(t('Order created'));
    } catch (error) { notify(t(error.message)); }
  };

  const changeStatus = async (order, status) => {
    try { await updateOrder(order.id, status); await onRefresh(); notify(t('Order status updated')); }
    catch (error) { notify(t(error.message)); }
  };

  return (
    <>
      <section className="page-actions">
        <div className="filter-tabs"><button className={filter === 'All' ? 'active' : ''} onClick={() => setFilter('All')}>{t('All Orders')}</button><button className={filter === 'Purchase' ? 'active' : ''} onClick={() => setFilter('Purchase')}>{t('Purchase Orders')}</button><button className={filter === 'International' ? 'active' : ''} onClick={() => setFilter('International')}>{t('International')}</button></div>
        {user.role === 'admin' && <button className="primary-button" onClick={() => setShowForm(true)}>＋ {t('Create Order')}</button>}
      </section>
      <section className="panel data-panel">
        <div className="panel-heading"><div><p className="overline">{t('ORDER PIPELINE')}</p><h3>{t('Order History')} <span className="muted-count">{visible.length}</span></h3></div></div>
        <div className="table-wrap">
          <table><thead><tr><th>{t('Order')}</th><th>{t('Type')}</th><th>{t('Supplier / Channel')}</th><th>{t('Product')}</th><th>{t('Destination')}</th><th>{t('Quantity')}</th><th>{t('Date')}</th><th>{t('Status')}</th></tr></thead>
          <tbody>{visible.map((order) => <tr key={order.id}><td><strong>#{String(order.id).padStart(4, '0')}</strong></td><td><span className="region-chip">{t(order.order_type)}</span></td><td>{order.supplier}</td><td><strong>{order.product_name}</strong></td><td>{order.destination_region}</td><td>{order.quantity}</td><td>{shortDate(order.created_at, language === 'zh' ? 'zh-CN' : 'en-US')}</td><td>{user.role === 'admin' ? <select className={`status-select ${orderStatusClass(order.status)}`} value={order.status} onChange={(event) => changeStatus(order, event.target.value)}>{statuses.map((status) => <option value={status} key={status}>{t(status)}</option>)}</select> : <span className={`status ${orderStatusClass(order.status)}`}>{t(order.status)}</span>}</td></tr>)}</tbody></table>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
        <form className="modal compact-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading"><div><p className="overline">{t('OPERATIONS')}</p><h2>{t('Create Order')}</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div>
          <div className="form-grid">
            <label>{t('Order Type')}<select value={form.order_type} onChange={(event) => setForm({ ...form, order_type: event.target.value })}><option value="Purchase">{t('Purchase')}</option><option value="International">{t('International')}</option></select></label>
            <label>{t('Status')}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((status) => <option value={status} key={status}>{t(status)}</option>)}</select></label>
            <label>{t('Supplier / Channel')}<input value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} required /></label>
            <label>{t('Product')}<input value={form.product_name} onChange={(event) => setForm({ ...form, product_name: event.target.value })} required /></label>
            <label>{t('Destination Region')}<input value={form.destination_region} onChange={(event) => setForm({ ...form, destination_region: event.target.value })} required /></label>
            <label>{t('Quantity')}<input type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>{t('Cancel')}</button><button className="primary-button">{t('Create Order')}</button></div>
        </form>
      </div>}
    </>
  );
}

export default OrdersPage;
