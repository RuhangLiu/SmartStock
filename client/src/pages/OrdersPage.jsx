import { useState } from 'react';
import { addOrder, updateOrder } from '../services/api';
import { orderStatusClass, shortDate } from '../utils';

const initialForm = { supplier: '', product_name: '', quantity: '', status: 'Pending', destination_region: 'China', order_type: 'Purchase' };
const statuses = ['Pending', 'Processing', 'In Transit', 'Delivered', 'Cancelled'];

function OrdersPage({ orders, user, onRefresh, notify }) {
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
      notify('Order created');
    } catch (error) { notify(error.message); }
  };

  const changeStatus = async (order, status) => {
    try { await updateOrder(order.id, status); await onRefresh(); notify('Order status updated'); }
    catch (error) { notify(error.message); }
  };

  return (
    <>
      <section className="page-actions">
        <div className="filter-tabs"><button className={filter === 'All' ? 'active' : ''} onClick={() => setFilter('All')}>All Orders</button><button className={filter === 'Purchase' ? 'active' : ''} onClick={() => setFilter('Purchase')}>Purchase Orders</button><button className={filter === 'International' ? 'active' : ''} onClick={() => setFilter('International')}>International</button></div>
        {user.role === 'admin' && <button className="primary-button" onClick={() => setShowForm(true)}>＋ Create Order</button>}
      </section>
      <section className="panel data-panel">
        <div className="panel-heading"><div><p className="overline">ORDER PIPELINE</p><h3>Order History <span className="muted-count">{visible.length}</span></h3></div></div>
        <div className="table-wrap">
          <table><thead><tr><th>Order</th><th>Type</th><th>Supplier / Channel</th><th>Product</th><th>Destination</th><th>Quantity</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>{visible.map((order) => <tr key={order.id}><td><strong>#{String(order.id).padStart(4, '0')}</strong></td><td><span className="region-chip">{order.order_type}</span></td><td>{order.supplier}</td><td><strong>{order.product_name}</strong></td><td>{order.destination_region}</td><td>{order.quantity}</td><td>{shortDate(order.created_at)}</td><td>{user.role === 'admin' ? <select className={`status-select ${orderStatusClass(order.status)}`} value={order.status} onChange={(event) => changeStatus(order, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select> : <span className={`status ${orderStatusClass(order.status)}`}>{order.status}</span>}</td></tr>)}</tbody></table>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
        <form className="modal compact-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading"><div><p className="overline">OPERATIONS</p><h2>Create Order</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Order Type<select value={form.order_type} onChange={(event) => setForm({ ...form, order_type: event.target.value })}><option>Purchase</option><option>International</option></select></label>
            <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>Supplier / Channel<input value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} required /></label>
            <label>Product<input value={form.product_name} onChange={(event) => setForm({ ...form, product_name: event.target.value })} required /></label>
            <label>Destination Region<input value={form.destination_region} onChange={(event) => setForm({ ...form, destination_region: event.target.value })} required /></label>
            <label>Quantity<input type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button">Create Order</button></div>
        </form>
      </div>}
    </>
  );
}

export default OrdersPage;
