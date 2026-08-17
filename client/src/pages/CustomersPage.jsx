import { useMemo, useState } from 'react';
import { addCustomer, deleteCustomer } from '../services/api';
import { money } from '../utils';
import { useI18n } from '../i18n';

function CustomersPage({ customers, user, onRefresh, notify }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', region: 'United States' });
  const visible = useMemo(() => customers.filter((customer) =>
    [customer.name, customer.email, customer.region].some((value) => String(value).toLowerCase().includes(search.toLowerCase()))
  ), [customers, search]);

  const submit = async (event) => {
    event.preventDefault();
    try { await addCustomer(form); setShowForm(false); setForm({ name: '', email: '', phone: '', region: 'United States' }); await onRefresh(); notify(t('Customer added')); }
    catch (error) { notify(t(error.message)); }
  };

  const remove = async (customer) => {
    if (!window.confirm(t('Delete {name}? This action cannot be undone.', { name: customer.name }))) return;
    setDeletingId(customer.id);
    try {
      await deleteCustomer(customer.id);
      await onRefresh();
      notify(t('Customer deleted'));
    } catch (error) {
      notify(t(error.message));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <section className="page-actions">
        <div className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search customers by name, email, or region…')} /></div>
        {user.role === 'admin' && <button className="primary-button" onClick={() => setShowForm(true)}>＋ {t('Add Customer')}</button>}
      </section>
      <section className="customer-grid">
        {visible.map((customer) => <article className="customer-card" key={customer.id}>
          <div className="customer-card-head">
            <span>{customer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
            <div className="customer-card-tools">
              <i className="region-chip">{customer.region}</i>
              {user.role === 'admin' && <button
                type="button"
                className="customer-delete-button"
                onClick={() => remove(customer)}
                disabled={deletingId === customer.id || Number(customer.total_purchases) > 0}
                aria-label={t('Delete {name}', { name: customer.name })}
                title={Number(customer.total_purchases) > 0 ? t('Customers with purchase history cannot be deleted') : t('Delete Customer')}
              >{deletingId === customer.id ? '…' : '×'}</button>}
            </div>
          </div>
          <h3>{customer.name}</h3>
          <p>{customer.email}</p>
          <p>{customer.phone || t('No phone provided')}</p>
          <div><small>{t('Total Purchases')}</small><strong>{money(customer.total_purchases)}</strong></div>
        </article>)}
      </section>
      {!visible.length && <div className="panel empty-state">{t('No customers match your search.')}</div>}
      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}><form className="modal compact-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="overline">{t('CUSTOMER DIRECTORY')}</p><h2>{t('Add Customer')}</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid"><label>{t('Full Name')}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>{t('Email')}<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>{t('Phone')}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>{t('Region')}<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} required /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>{t('Cancel')}</button><button className="primary-button">{t('Add Customer')}</button></div></form></div>}
    </>
  );
}

export default CustomersPage;
