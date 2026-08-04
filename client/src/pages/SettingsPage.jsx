import { useEffect, useState } from 'react';
import { registerUser, updateSettings } from '../services/api';
import { useI18n } from '../i18n';

function SettingsPage({ settings, user, onRefresh, notify }) {
  const { t } = useI18n();
  const [form, setForm] = useState(settings || {});
  const [staff, setStaff] = useState({ name: '', email: '', password: '', role: 'employee' });
  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const save = async (event) => {
    event.preventDefault();
    try { await updateSettings({ ...form, default_threshold: Number(form.default_threshold) }); await onRefresh(); notify(t('Store settings saved')); }
    catch (error) { notify(t(error.message)); }
  };

  const addStaff = async (event) => {
    event.preventDefault();
    try { await registerUser(staff); setStaff({ name: '', email: '', password: '', role: 'employee' }); notify(t('Staff account created')); }
    catch (error) { notify(t(error.message)); }
  };

  if (user.role !== 'admin') return <section className="panel permission-card"><span>🔒</span><h2>{t('Admin access required')}</h2><p>{t('Store settings and staff accounts are available to administrators only.')}</p></section>;

  return (
    <div className="settings-grid">
      <form className="panel stack-form" onSubmit={save}>
        <div className="panel-heading"><div><p className="overline">{t('WORKSPACE')}</p><h3>{t('Store Information')}</h3></div></div>
        <label>{t('Store Name')}<input value={form.store_name || ''} onChange={(event) => setForm({ ...form, store_name: event.target.value })} required /></label>
        <label>{t('Store Email')}<input type="email" value={form.store_email || ''} onChange={(event) => setForm({ ...form, store_email: event.target.value })} required /></label>
        <div className="form-grid"><label>{t('Default Low-Stock Threshold')}<input type="number" min="0" value={form.default_threshold || 0} onChange={(event) => setForm({ ...form, default_threshold: event.target.value })} required /></label><label>{t('Currency')}<select value={form.currency || 'USD'} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option></select></label></div>
        <label>{t('Admin Contact')}<input value={form.admin_name || ''} onChange={(event) => setForm({ ...form, admin_name: event.target.value })} required /></label>
        <button className="primary-button">{t('Save Settings')}</button>
      </form>
      <form className="panel stack-form" onSubmit={addStaff}>
        <div className="panel-heading"><div><p className="overline">{t('ACCESS CONTROL')}</p><h3>{t('Create Staff Account')}</h3></div></div>
        <label>{t('Full Name')}<input value={staff.name} onChange={(event) => setStaff({ ...staff, name: event.target.value })} required /></label>
        <label>{t('Email')}<input type="email" value={staff.email} onChange={(event) => setStaff({ ...staff, email: event.target.value })} required /></label>
        <label>{t('Temporary Password')}<input type="password" minLength="8" value={staff.password} onChange={(event) => setStaff({ ...staff, password: event.target.value })} required /><small>{t('Minimum 8 characters')}</small></label>
        <label>{t('Role')}<select value={staff.role} onChange={(event) => setStaff({ ...staff, role: event.target.value })}><option value="employee">{t('Employee — sales and inventory view')}</option><option value="admin">{t('Admin — full access')}</option></select></label>
        <button className="primary-button">{t('Create Account')}</button>
      </form>
    </div>
  );
}

export default SettingsPage;
