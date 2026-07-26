import { useMemo, useState } from 'react';
import { addCustomer } from '../services/api';
import { money } from '../utils';

function CustomersPage({ customers, user, onRefresh, notify }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', region: 'United States' });
  const visible = useMemo(() => customers.filter((customer) =>
    [customer.name, customer.email, customer.region].some((value) => String(value).toLowerCase().includes(search.toLowerCase()))
  ), [customers, search]);

  const submit = async (event) => {
    event.preventDefault();
    try { await addCustomer(form); setShowForm(false); setForm({ name: '', email: '', phone: '', region: 'United States' }); await onRefresh(); notify('Customer added'); }
    catch (error) { notify(error.message); }
  };

  return (
    <>
      <section className="page-actions">
        <div className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers by name, email, or region…" /></div>
        {user.role === 'admin' && <button className="primary-button" onClick={() => setShowForm(true)}>＋ Add Customer</button>}
      </section>
      <section className="customer-grid">
        {visible.map((customer) => <article className="customer-card" key={customer.id}><div className="customer-card-head"><span>{customer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><i className="region-chip">{customer.region}</i></div><h3>{customer.name}</h3><p>{customer.email}</p><p>{customer.phone || 'No phone provided'}</p><div><small>Total Purchases</small><strong>{money(customer.total_purchases)}</strong></div></article>)}
      </section>
      {!visible.length && <div className="panel empty-state">No customers match your search.</div>}
      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}><form className="modal compact-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="overline">CUSTOMER DIRECTORY</p><h2>Add Customer</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid"><label>Full Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Region<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} required /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button">Add Customer</button></div></form></div>}
    </>
  );
}

export default CustomersPage;
