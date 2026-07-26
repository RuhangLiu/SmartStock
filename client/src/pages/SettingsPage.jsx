import { useEffect, useState } from 'react';
import { registerUser, updateSettings } from '../services/api';

function SettingsPage({ settings, user, onRefresh, notify }) {
  const [form, setForm] = useState(settings || {});
  const [staff, setStaff] = useState({ name: '', email: '', password: '', role: 'employee' });
  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const save = async (event) => {
    event.preventDefault();
    try { await updateSettings({ ...form, default_threshold: Number(form.default_threshold) }); await onRefresh(); notify('Store settings saved'); }
    catch (error) { notify(error.message); }
  };

  const addStaff = async (event) => {
    event.preventDefault();
    try { await registerUser(staff); setStaff({ name: '', email: '', password: '', role: 'employee' }); notify('Staff account created'); }
    catch (error) { notify(error.message); }
  };

  if (user.role !== 'admin') return <section className="panel permission-card"><span>🔒</span><h2>Admin access required</h2><p>Store settings and staff accounts are available to administrators only.</p></section>;

  return (
    <div className="settings-grid">
      <form className="panel stack-form" onSubmit={save}>
        <div className="panel-heading"><div><p className="overline">WORKSPACE</p><h3>Store Information</h3></div></div>
        <label>Store Name<input value={form.store_name || ''} onChange={(event) => setForm({ ...form, store_name: event.target.value })} required /></label>
        <label>Store Email<input type="email" value={form.store_email || ''} onChange={(event) => setForm({ ...form, store_email: event.target.value })} required /></label>
        <div className="form-grid"><label>Default Low-Stock Threshold<input type="number" min="0" value={form.default_threshold || 0} onChange={(event) => setForm({ ...form, default_threshold: event.target.value })} required /></label><label>Currency<select value={form.currency || 'USD'} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option></select></label></div>
        <label>Admin Contact<input value={form.admin_name || ''} onChange={(event) => setForm({ ...form, admin_name: event.target.value })} required /></label>
        <button className="primary-button">Save Settings</button>
      </form>
      <form className="panel stack-form" onSubmit={addStaff}>
        <div className="panel-heading"><div><p className="overline">ACCESS CONTROL</p><h3>Create Staff Account</h3></div></div>
        <label>Full Name<input value={staff.name} onChange={(event) => setStaff({ ...staff, name: event.target.value })} required /></label>
        <label>Email<input type="email" value={staff.email} onChange={(event) => setStaff({ ...staff, email: event.target.value })} required /></label>
        <label>Temporary Password<input type="password" minLength="8" value={staff.password} onChange={(event) => setStaff({ ...staff, password: event.target.value })} required /><small>Minimum 8 characters</small></label>
        <label>Role<select value={staff.role} onChange={(event) => setStaff({ ...staff, role: event.target.value })}><option value="employee">Employee — sales and inventory view</option><option value="admin">Admin — full access</option></select></label>
        <button className="primary-button">Create Account</button>
      </form>
    </div>
  );
}

export default SettingsPage;
